"""App Store Connect setup for Bahrna, through Apple's official API (no browser needed).

Fills the App Store page from store/appstore/meta.json: texts (English + Arabic),
screenshots, privacy URL, content rights, age rating, price (free), review contact and
notes, and attaches the newest processed build. With --submit it also sends the version
to App Review. Runs on GitHub (workflow "App Store page") with the ASC_* secrets.

Every step prints what it did; a step that Apple refuses is reported and the script
carries on, so one run shows everything that still needs attention.
"""
import hashlib, json, os, sys, time, glob
import jwt, requests

API = 'https://api.appstoreconnect.apple.com/v1'
KEY_ID, ISSUER = os.environ['ASC_KEY_ID'], os.environ['ASC_ISSUER_ID']
KEY = open(os.environ['ASC_KEY_FILE']).read()
SUBMIT = '--submit' in sys.argv
META = json.load(open('store/appstore/meta.json', encoding='utf-8'))
problems = []


def token():
    now = int(time.time())
    return jwt.encode({'iss': ISSUER, 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'},
                      KEY, algorithm='ES256', headers={'kid': KEY_ID, 'typ': 'JWT'})


def call(method, path, body=None, params=None, ok=(200, 201, 204)):
    url = path if path.startswith('http') else API + path
    r = requests.request(method, url, params=params, json=body,
                         headers={'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json'}, timeout=60)
    if r.status_code not in ok:
        try:
            errs = r.json().get('errors', [])
            msg = '; '.join(f"{e.get('title')}: {e.get('detail')}" for e in errs)
        except Exception:
            msg = r.text[:400]
        raise RuntimeError(f'{method} {path} -> {r.status_code} {msg}')
    return r.json() if r.content else {}


def step(name, fn):
    try:
        out = fn()
        print(f'OK   {name}' + (f' ({out})' if out else ''))
        return out
    except Exception as e:  # report and continue
        print(f'FAIL {name}: {e}')
        problems.append(name)


# ---------- find the app, version, app info ----------
app = call('GET', '/apps', params={'filter[bundleId]': META['bundleId']})['data'][0]
APP = app['id']
print('App', APP, app['attributes']['name'])

vers = call('GET', f'/apps/{APP}/appStoreVersions', params={'filter[platform]': 'IOS', 'limit': 10})['data']
editable = [v for v in vers if v['attributes']['appStoreState'] in
            ('PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY')]
if not editable:
    sys.exit('No editable App Store version found: ' + ', '.join(v['attributes']['appStoreState'] for v in vers))
VER = editable[0]['id']
print('Version', VER, editable[0]['attributes']['versionString'], editable[0]['attributes']['appStoreState'])

infos = call('GET', f'/apps/{APP}/appInfos')['data']
INFO = [i for i in infos if i['attributes'].get('appStoreState') != 'READY_FOR_SALE'][0]['id']

step('version number / copyright / release after approval', lambda: call('PATCH', f'/appStoreVersions/{VER}', {'data': {
    'type': 'appStoreVersions', 'id': VER, 'attributes': {
        'versionString': META['version'], 'copyright': META['copyright'], 'releaseType': 'AFTER_APPROVAL'}}}) and None)

step('content rights', lambda: call('PATCH', f'/apps/{APP}', {'data': {
    'type': 'apps', 'id': APP, 'attributes': {'contentRightsDeclaration': META['contentRights']}}}) and None)


# ---------- localizations ----------
def info_locs():
    return {l['attributes']['locale']: l for l in call('GET', f'/appInfos/{INFO}/appInfoLocalizations')['data']}


def ver_locs():
    return {l['attributes']['locale']: l for l in call('GET', f'/appStoreVersions/{VER}/appStoreVersionLocalizations')['data']}


il, vl = info_locs(), ver_locs()
for loc, m in META['locales'].items():
    ia = {'name': m['name'], 'subtitle': m['subtitle'], 'privacyPolicyUrl': META['privacyUrl']}
    if loc in il:
        step(f'{loc} name/subtitle/privacy URL', lambda: call('PATCH', f"/appInfoLocalizations/{il[loc]['id']}", {'data': {
            'type': 'appInfoLocalizations', 'id': il[loc]['id'], 'attributes': ia}}) and None)
    else:
        step(f'{loc} add language (name/subtitle/privacy URL)', lambda: call('POST', '/appInfoLocalizations', {'data': {
            'type': 'appInfoLocalizations', 'attributes': {'locale': loc, **ia},
            'relationships': {'appInfo': {'data': {'type': 'appInfos', 'id': INFO}}}}}) and None)
    va = {'description': m['description'], 'keywords': m['keywords'], 'promotionalText': m['promotionalText'],
          'supportUrl': META['supportUrl'], 'marketingUrl': META['marketingUrl']}
    if loc in vl:
        step(f'{loc} description/keywords', lambda: call('PATCH', f"/appStoreVersionLocalizations/{vl[loc]['id']}", {'data': {
            'type': 'appStoreVersionLocalizations', 'id': vl[loc]['id'], 'attributes': va}}) and None)
    else:
        step(f'{loc} description/keywords (new)', lambda: call('POST', '/appStoreVersionLocalizations', {'data': {
            'type': 'appStoreVersionLocalizations', 'attributes': {'locale': loc, **va},
            'relationships': {'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': VER}}}}}) and None)

vl = ver_locs()


# ---------- screenshots ----------
def upload_shots(loc, folder):
    files = sorted(glob.glob(os.path.join(folder, '*.jpg')) + glob.glob(os.path.join(folder, '*.png')))
    if not files:
        return 'no files'
    lid = vl[loc]['id']
    sets = call('GET', f'/appStoreVersionLocalizations/{lid}/appScreenshotSets')['data']
    done = []
    for dtype in ('APP_IPHONE_67', 'APP_IPHONE_69'):
        try:
            s = next((x for x in sets if x['attributes']['screenshotDisplayType'] == dtype), None)
            if not s:
                s = call('POST', '/appScreenshotSets', {'data': {'type': 'appScreenshotSets',
                    'attributes': {'screenshotDisplayType': dtype},
                    'relationships': {'appStoreVersionLocalization': {'data': {'type': 'appStoreVersionLocalizations', 'id': lid}}}}})['data']
            sid = s['id']
            for old in call('GET', f'/appScreenshotSets/{sid}/appScreenshots')['data']:
                call('DELETE', f"/appScreenshots/{old['id']}")
            for f in files:
                data = open(f, 'rb').read()
                shot = call('POST', '/appScreenshots', {'data': {'type': 'appScreenshots',
                    'attributes': {'fileName': os.path.basename(f), 'fileSize': len(data)},
                    'relationships': {'appScreenshotSet': {'data': {'type': 'appScreenshotSets', 'id': sid}}}}})['data']
                for op in shot['attributes']['uploadOperations']:
                    part = data[op['offset']:op['offset'] + op['length']]
                    h = {x['name']: x['value'] for x in op.get('requestHeaders', [])}
                    r = requests.request(op['method'], op['url'], data=part, headers=h, timeout=120)
                    if r.status_code >= 300:
                        raise RuntimeError(f'upload part -> {r.status_code}')
                call('PATCH', f"/appScreenshots/{shot['id']}", {'data': {'type': 'appScreenshots', 'id': shot['id'],
                    'attributes': {'uploaded': True, 'sourceFileChecksum': hashlib.md5(data).hexdigest()}}})
            done.append(f'{dtype} x{len(files)}')
            break  # one display type is enough; Apple scales it for smaller iPhones
        except Exception as e:
            print(f'     {loc} {dtype}: {e}')
    if not done:
        raise RuntimeError('no screenshot set accepted')
    return ', '.join(done)


for loc, m in META['locales'].items():
    step(f'{loc} screenshots', lambda: upload_shots(loc, m['shots']))


# ---------- age rating: nothing objectionable in Bahrna ----------
def age_rating():
    decl = call('GET', f'/appInfos/{INFO}/ageRatingDeclaration')['data']
    attrs = {}
    for k, v in decl['attributes'].items():
        if k in ('ageRatingOverride', 'koreaAgeRatingOverride', 'ageRatingOverrideV2'):
            attrs[k] = 'NONE'
        elif k in ('kidsAgeBand', 'developerAgeRatingInfoUrl'):
            continue
        elif isinstance(v, bool) or k.startswith('is') or k in (
                'gambling', 'lootBox', 'unrestrictedWebAccess', 'messagingAndChat', 'parentalControls',
                'ageAssurance', 'userGeneratedContent', 'advertising', 'healthOrWellnessTopics'):
            attrs[k] = False
        else:
            attrs[k] = 'NONE'
    try:
        call('PATCH', f"/ageRatingDeclarations/{decl['id']}", {'data': {'type': 'ageRatingDeclarations', 'id': decl['id'], 'attributes': attrs}})
    except RuntimeError as e:
        # drop fields Apple refuses one by one
        for k in list(attrs):
            try:
                call('PATCH', f"/ageRatingDeclarations/{decl['id']}", {'data': {'type': 'ageRatingDeclarations', 'id': decl['id'], 'attributes': {k: attrs[k]}}})
            except RuntimeError as e2:
                print(f'     age field {k}: {e2}')
    return f'{len(attrs)} answers'


step('age rating (all "None")', age_rating)


# ---------- price: free in every country ----------
def price_free():
    pts = call('GET', f'/apps/{APP}/appPricePoints', params={'filter[territory]': 'USA', 'limit': 200})['data']
    free = next(p for p in pts if float(p['attributes']['customerPrice']) == 0)
    call('POST', '/appPriceSchedules', {
        'data': {'type': 'appPriceSchedules', 'relationships': {
            'app': {'data': {'type': 'apps', 'id': APP}},
            'baseTerritory': {'data': {'type': 'territories', 'id': 'USA'}},
            'manualPrices': {'data': [{'type': 'appPrices', 'id': '${price1}'}]}}},
        'included': [{'type': 'appPrices', 'id': '${price1}', 'attributes': {'startDate': None},
                      'relationships': {'appPricePoint': {'data': {'type': 'appPricePoints', 'id': free['id']}}}}]})
    return 'free'


step('price: free', price_free)


def availability():
    terrs = []
    url = '/territories?limit=200'
    while url:
        r = call('GET', url)
        terrs += [t['id'] for t in r['data']]
        url = r.get('links', {}).get('next')
    inc = [{'type': 'territoryAvailabilities', 'id': f'${{t{i}}}', 'attributes': {'available': True},
            'relationships': {'territory': {'data': {'type': 'territories', 'id': t}}}} for i, t in enumerate(terrs)]
    call('POST', 'https://api.appstoreconnect.apple.com/v2/appAvailabilities', {
        'data': {'type': 'appAvailabilities', 'attributes': {'availableInNewTerritories': True}, 'relationships': {
            'app': {'data': {'type': 'apps', 'id': APP}},
            'territoryAvailabilities': {'data': [{'type': 'territoryAvailabilities', 'id': x['id']} for x in inc]}}},
        'included': inc})
    return f'{len(terrs)} countries'


step('available in all countries', availability)


# ---------- App Review contact + notes ----------
def review():
    rv = META['review']
    try:
        d = call('GET', f'/appStoreVersions/{VER}/appStoreReviewDetail')['data']
    except RuntimeError:
        d = None
    if d:
        call('PATCH', f"/appStoreReviewDetails/{d['id']}", {'data': {'type': 'appStoreReviewDetails', 'id': d['id'], 'attributes': rv}})
    else:
        call('POST', '/appStoreReviewDetails', {'data': {'type': 'appStoreReviewDetails', 'attributes': rv,
            'relationships': {'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': VER}}}}})


step('App Review contact and notes', review)


# ---------- build ----------
def attach_build():
    builds = call('GET', '/builds', params={'filter[app]': APP, 'filter[preReleaseVersion.version]': META['version'],
                                            'filter[processingState]': 'VALID', 'sort': '-uploadedDate', 'limit': 5})['data']
    if not builds:
        raise RuntimeError('no processed build for version ' + META['version'])
    b = builds[0]
    if b['attributes'].get('usesNonExemptEncryption') is None:
        try:
            call('PATCH', f"/builds/{b['id']}", {'data': {'type': 'builds', 'id': b['id'], 'attributes': {'usesNonExemptEncryption': False}}})
        except RuntimeError:
            pass
    call('PATCH', f'/appStoreVersions/{VER}/relationships/build', {'data': {'type': 'builds', 'id': b['id']}})
    return 'build ' + b['attributes']['version']


step('attach build', attach_build)


# ---------- submit ----------
if SUBMIT:
    def submit():
        subs = call('GET', '/reviewSubmissions', params={'filter[app]': APP, 'filter[platform]': 'IOS',
                                                         'filter[state]': 'READY_FOR_REVIEW'})['data']
        sid = subs[0]['id'] if subs else call('POST', '/reviewSubmissions', {'data': {'type': 'reviewSubmissions',
            'attributes': {'platform': 'IOS'}, 'relationships': {'app': {'data': {'type': 'apps', 'id': APP}}}}})['data']['id']
        try:
            call('POST', '/reviewSubmissionItems', {'data': {'type': 'reviewSubmissionItems', 'relationships': {
                'reviewSubmission': {'data': {'type': 'reviewSubmissions', 'id': sid}},
                'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': VER}}}}})
        except RuntimeError as e:
            if 'already' not in str(e).lower():
                raise
        call('PATCH', f'/reviewSubmissions/{sid}', {'data': {'type': 'reviewSubmissions', 'id': sid, 'attributes': {'submitted': True}}})
        return 'submitted for review'
    step('SUBMIT FOR REVIEW', submit)

print()
print('Needs attention:' if problems else 'All steps done.', ', '.join(problems))
sys.exit(1 if problems else 0)
