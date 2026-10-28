# Regenerates _data/repos.yml from the GitHub API. Keeps pin/desc edits by name.
import json,urllib.request,yaml,sys
old={r['name']:r for r in yaml.safe_load(open('_data/repos.yml')) or []}
rs=json.load(urllib.request.urlopen('https://api.github.com/users/Ztgunderson/repos?per_page=100&sort=updated'))
rows=[old['I-Spy-Robot/seen-vs-followed']]+[{'name':r['name'],'url':r['html_url'],'lang':r['language'] or '','desc':old.get(r['name'],{}).get('desc') or r['description'] or '','pin':old.get(r['name'],{}).get('pin',False),'fork':r['fork']} for r in rs]
open('_data/repos.yml','w').write('\n'.join('- '+json.dumps(r) for r in rows)+'\n')
