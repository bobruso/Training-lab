from pathlib import Path
src=Path('tools/patch_adaptive_home_v75.py').read_text(encoding='utf-8')
old="""# Ensure adaptive response is always re-rendered with all cloud/activity updates.\nold='function renderV5(){\\n renderQuestions();'\nnew='function renderV5(){\\n renderAdaptiveActivityResponse();renderQuestions();'\nif old not in s: raise SystemExit('renderV5 anchor missing')\ns=s.replace(old,new,1)\n"""
new="""# Ensure adaptive response is always re-rendered with all cloud/activity updates.\nif 'function renderV5(){' not in s: raise SystemExit('renderV5 anchor missing')\ns=s.replace('function renderV5(){','function renderV5(){renderAdaptiveActivityResponse();',1)\n"""
if old not in src: raise SystemExit('runner could not patch renderV5 logic')
src=src.replace(old,new,1)
exec(compile(src,'patch_adaptive_home_v75.py','exec'))
