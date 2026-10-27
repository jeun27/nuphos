import type { BotAvatarFile } from '../botAvatars'

/**
 * What each face says when you pick it up: short, kind and about what the person or
 * painting is known for. Shared by every onboarding screen that shows the faces.
 */
export const FACE_LINES: Record<BotAvatarFile, string> = {
  '01-vermeer-girl.svg': 'Mind the pearl, please!',
  '02-leonardo.svg': 'I could invent a parachute.',
  '03-mona-lisa.svg': 'Was that a smile? Maybe.',
  '04-venus.svg': 'I usually travel by seashell.',
  '05-rembrandt.svg': 'Light me from the left!',
  '06-beethoven.svg': 'Da-da-da-DUM! Put me down.',
  '07-ada.svg': 'Computing my landing...',
  '08-socrates.svg': 'Why am I up here?',
  '09-frida.svg': 'Careful with my flowers!',
  '10-van-gogh.svg': "Careful, I've only one ear.",
  '11-mozart.svg': 'Put me down, allegro!',
  '12-newton.svg': 'Gravity says I should fall.',
  '13-shakespeare.svg': 'To drop, or not to drop?',
  '14-napoleon.svg': 'Retreat? Never. Put me down.',
  '15-cleopatra.svg': 'Carry me like a queen.',
  '16-athena.svg': 'Wisely, put me down.',
  '17-the-scream.svg': 'AAAAH! Too high!',
  '18-american-gothic.svg': 'Mind the pitchfork.',
  '19-the-fifer.svg': "Hold still, I'm mid-tune.",
  '20-son-of-man.svg': 'Who moved my apple?',
  '21-the-milkmaid.svg': "Don't spill the milk!",
  '22-lady-with-an-ermine.svg': 'My ermine gets airsick.',
  '23-girl-with-peaches.svg': "Don't drop my peaches!",
  '24-the-blue-boy.svg': 'Mind the blue satin!',
  '25-infanta.svg': 'Is the painter watching?',
  '26-the-swing.svg': 'Wheee! Push me higher!',
  '27-the-astronomer.svg': 'I can see the stars from here!',
  '28-the-sleeping-gypsy.svg': "Shh, the lion's asleep.",
}
