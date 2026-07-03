import codecs

with codecs.open('src/components/PlayerBar.tsx', 'r', 'utf-8') as f:
    content = f.read()

new_imports = '''import { ListMusic, Mic2 } from 'lucide-react'
import QueuePanel from './QueuePanel'
import LyricsPanel from './LyricsPanel'
'''
content = content.replace(
    '''import { useLanguage } from '../context/LanguageContext'\n''',
    '''import { useLanguage } from '../context/LanguageContext'\n''' + new_imports
)

content = content.replace(
    '''export default function PlayerBar() {''',
    '''export default function PlayerBar() {
  const [isQueueOpen, setIsQueueOpen] = useState(false)
  const [isLyricsOpen, setIsLyricsOpen] = useState(false)'''
)

extra_buttons = """
            <button 
              className={`p-2 transition rounded-full ${isLyricsOpen ? 'text-[var(--color-primary)] bg-white/10' : 'text-white/50 hover:text-white'}`}
              onClick={() => setIsLyricsOpen(!isLyricsOpen)}
            >
              <Mic2 size={20} />
            </button>
            <button 
              className={`p-2 transition rounded-full ${isQueueOpen ? 'text-[var(--color-primary)] bg-white/10' : 'text-white/50 hover:text-white'}`}
              onClick={() => setIsQueueOpen(!isQueueOpen)}
            >
              <ListMusic size={20} />
            </button>
"""
# I'll inject these before the volume slider which has a volume icon, but it's hard to guess the exact line. Let's look for `<Volume2` or something similar, or just before `<button` that toggles mute.
content = content.replace(
    '''            <button\n              className="p-2 text-white/50 hover:text-white transition"''',
    extra_buttons + '''            <button\n              className="p-2 text-white/50 hover:text-white transition"''',
    1 # Only replace the first occurrence (which is usually the volume button if we search accurately, wait, let's search for Volume explicitly instead)
)

content = content.replace(
    '''            <Volume2 size={20} />''',
    '''            <Volume2 size={20} />'''
)

panels = '''
      <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
      <LyricsPanel isOpen={isLyricsOpen} onClose={() => setIsLyricsOpen(false)} />
'''
content = content.replace(
    '''    </motion.div>\n  )\n}\n''',
    panels + '''    </motion.div>\n  )\n}\n'''
)

with codecs.open('src/components/PlayerBar.tsx', 'w', 'utf-8') as f:
    f.write(content)
