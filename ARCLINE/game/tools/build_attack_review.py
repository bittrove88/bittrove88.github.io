"""Build the no-save viewer with the same runtime modules as the game."""
import re
from release import ROOT, CONFIG
modules=['release-info','i18n','levels','attack-catalog','combat','battle-catalog','skills','weapons','geometry','physics','inventory','crew','crew-usage','final-team','encounters','enemy-attacks','boss-actions','enemy-actions','engine','visual-style','visual-registry','characters','aim-guide','effects','actor-bodies','visual-art','charge-camera','backgrounds','component-art','render','lessons','attack-motion','preview','attack-review-model']
p=ROOT/'game/attack-review/index.html'
text=p.read_text()
block='<!-- review:scripts:start -->\n'+'\n'.join(f'<script src="../dist/{n}.js?v={CONFIG["cacheVersion"]}"></script>' for n in modules)+'\n<!-- review:scripts:end -->'
text=re.sub(r'<!-- review:scripts:start -->.*?<!-- review:scripts:end -->|<!-- review:scripts -->',lambda _:block,text,flags=re.S)
p.write_text(text)
# An offline review copy makes the exact same implementation directly inspectable.
standalone=text.replace('<link rel="stylesheet" href="review.css">','<style>'+(p.parent/'review.css').read_text()+'</style>')
standalone=standalone.replace('<a href="../dist/">ARCLINE</a>','<span>ARCLINE '+CONFIG['version']+' · REVIEW</span>')
embedded='\n'.join('<script>'+re.sub(r'</script',r'<\\/script',(ROOT/'game/dist'/f'{n}.js').read_text(),flags=re.I)+'</script>' for n in modules)
standalone=re.sub(r'<!-- review:scripts:start -->.*?<!-- review:scripts:end -->',lambda _:embedded,standalone,flags=re.S)
standalone=standalone.replace('<script src="review.js"></script>','<script>'+(p.parent/'review.js').read_text()+'</script>')
(p.parent/'standalone.html').write_text(standalone)
