/**
 * Act I and Act II scene content (GDD §6.1, §6.2, §10.3) — the game's first
 * story data written against the frozen scene contract (scene-types.ts).
 *
 * Prose is drafted to the tight template — 80 to 160 words per scene,
 * fresh in the game's voice, adapted from the source rather than copied
 * (GDD §1.1); refinement lands in the Session 6 polish pass, and the
 * fidelity pass before the dungeon sessions. Every DC here is the design
 * starting value from Chapter 6.
 *
 * Scene variants (Insight read/ease, map case/no case, runner down/gone/
 * caught, talks/silent, trail quiet/spotted) are distinct scene records —
 * the history tracks which variant played, and no extra flags are needed
 * for prose branching.
 */

import type { Scene } from "@/game/scene-types";
import type { ItemId } from "@/content/items";

/* ══════════════════════════ Act I — The Road from Neverwinter ══════════════════════════ */

const act1Job: Scene = {
  id: "act1-job",
  act: 1,
  title: "An Offer of Ten Gold",
  location: "Act I · Neverwinter, the wagon yard",
  tableau: { setting: "city", time: "morning", props: ["wagon"] },
  prose:
    "Neverwinter's east gate smells of rain on warm stone. The wagon stands ready in the yard — provisions under rope, a spare axle lashed to the rail — and beside it waits the dwarf who is paying for all of it. Gundren Rockseeker is shorter than his own beard is long, and twice as loud. Ten gold apiece, he says, to drive the load east along the Triboar Trail to Phandalin. He will not be riding with you; he and a bodyguard, a human warrior named Sildar Hallwinter, mean to push on ahead, and he clearly cannot wait to be gone. Maera catches the way his fingers drum his belt. Elyndra notices how often he glances at the road. Whatever the dwarf is chasing, he did not hire you for the wagon. He hired you so the wagon would not slow him down.",
  choices: [
    {
      id: "watch-gundren",
      label: "Watch the dwarf while he talks",
      detail: "Maera reads his face while the others load",
      check: {
        skill: "Insight",
        dc: 10,
        successScene: "act1-job-read",
        failureScene: "act1-job-ease",
      },
      goto: "act1-job-read",
    },
    {
      id: "talk-wagons",
      label: "Talk wagons and weather",
      detail: "Perrin keeps it light while the harness is checked",
      goto: "act1-road",
    },
  ],
};

const act1JobRead: Scene = {
  id: "act1-job-read",
  act: 1,
  title: "Hiding Joy, Not Fear",
  location: "Act I · Neverwinter, the wagon yard",
  tableau: { setting: "city", time: "morning", props: ["wagon"] },
  prose:
    "Maera has nursed enough wounded men to know the difference between one hiding fear and one hiding joy. Gundren is the second kind. It pours out of him in slips: a brother in Phandalin, another brother somewhere east, and something found — a discovery, he says, then bites it off and stares at his boots with a grin he cannot put away. He is not afraid of this road. He is racing toward something at the end of it, and the ten gold means less to him than two days' head start. 'Watch the wagon, watch the road, and mind the thickets past the bend,' he says, swinging up beside Sildar, laughing at his own caution. Then the two of them are gone east in a fan of dust, and the yard is suddenly quiet, and the road is suddenly yours.",
  choices: [
    {
      id: "take-reins-read",
      label: "Take the reins and roll east",
      detail: "The wagon creaks; the city gate swallows itself behind you",
      goto: "act1-road",
    },
  ],
};

const act1JobEase: Scene = {
  id: "act1-job-ease",
  act: 1,
  title: "Answers Like Rain Off Wax",
  location: "Act I · Neverwinter, the wagon yard",
  tableau: { setting: "city", time: "morning", props: ["wagon"] },
  prose:
    "The dwarf answers questions the way a bucket answers a hole: badly, and only what leaks. Gold on delivery, he says. A road, he says. A town called Phandalin. Beyond that, every question rolls off him like rain off wax, and Perrin — who has made a career of loose tongues — gets nothing at all except a growing certainty that the dwarf knows exactly what he is doing. Whatever Gundren is about, the coin is real and the work is simple. Torvald spits on his palm, shakes on it, and starts checking the harness. 'Wagon's sound,' he says. 'Roads are roads.' Two miles east you can still see the dwarf's dust on the horizon, far ahead, hurrying like a man who left the stove lit.",
  choices: [
    {
      id: "take-reins-ease",
      label: "Take the reins and roll east",
      detail: "The wagon creaks; the city gate swallows itself behind you",
      goto: "act1-road",
    },
  ],
};

const act1Road: Scene = {
  id: "act1-road",
  act: 1,
  title: "The High Road, East",
  location: "Act I · Two days out of Neverwinter",
  tableau: { setting: "road", time: "day", props: ["wagon"] },
  prose:
    "The High Road out of Neverwinter is everything a road should be: graded, patrolled, boring. For a day and a half you barely see it, because you barely have to. Torvald drives. Perrin rides the tailboard and names every bird. Elyndra reads. Maera takes notes on who eats when — a nurse's habit — and thinks aloud about the road beyond, because the High Road ends at the Triboar Trail, and the Triboar Trail is frontier gravel with an honest reputation for wolves, weather, and worse. This is the rhythm the next sixty miles will ask of you: move all day, camp at dusk, and trust the wagon's axles more than any map. By late afternoon the farms have given out, the fences have given out, and ahead the trail bends into long brown meadow grass with the sun going low and red behind it.",
  choices: [
    {
      id: "camp-good",
      label: "Make for the good campsite before dark",
      detail: "Old rut-sheltered ground Maera marked on the way east",
      goto: "act1-camp",
    },
    {
      id: "camp-far",
      label: "Push another mile past the bend",
      detail: "More distance now means a colder camp later",
      goto: "act1-camp",
    },
  ],
};

const act1Camp: Scene = {
  id: "act1-camp",
  act: 1,
  title: "Rest Is a Weapon",
  location: "Act I · The Triboar Trail, dusk",
  tableau: { setting: "camp", time: "night", props: ["campfire", "wagon"] },
  prose:
    "Dusk comes down like a lid. You camp where the ruts have flattened old ground — sheltered from the wind, firelight contained, the wagon chained tongue-up between you and the world. This is the part of the road Maera insists on doing properly: a hot meal, wounds cleaned, feet wrapped, spells banked. She rations out the last of the bread like a woman dividing treasure. 'Rest is a weapon,' she says, poking the fire. 'The day will come when you want it back.' Around you the meadow ticks and breathes; somewhere far off, a fox screams once and is answered by nothing. Nothing is coming for you tonight. The first watch is Elyndra's, and she takes it with her back against a wheel, watching the east go black, one hand loose around her staff, perfectly, contentedly awake.",
  choices: [
    {
      id: "camp-rest",
      label: "Make camp properly — short rest",
      detail: "Roll hit dice and bank what the fire can mend",
      requires: [{ kind: "restAvailable" }],
      effects: [{ kind: "shortRest" }],
      goto: "act1-camp-rest",
    },
    {
      id: "camp-watch",
      label: "First watch, then sleep",
      detail: "Nothing needs mending; let the night pass as it is",
      goto: "act2-horses",
    },
  ],
};

const act1CampRest: Scene = {
  id: "act1-camp-rest",
  act: 1,
  rest: true,
  title: "The Camp Does Its Slow Work",
  location: "Act I · The Triboar Trail, night",
  tableau: { setting: "camp", time: "night", props: ["campfire", "wagon"] },
  prose:
    "The camp does its slow work. Maera salts and cleans, Elyndra banks the fire to her liking, and one by one the party takes an hour to themselves — boots off, eyes shut, dice rolling quietly where the firelight can see them. Torvald wraps his knuckles and mutters over them like a foreman. Perrin stretches out flat on the wagon's tail and is asleep in the time it takes to describe. It is nothing like a proper inn and everything like a good bivouac: warm side, cold side, and someone you trust on the cold side. By the third hour the whole meadow has settled, and the night passes without one single sound worth waking for — which is, Maera notes in her journal, the best result any rest has ever produced in the field.",
  choices: [
    {
      id: "break-camp",
      label: "Break camp at first light",
      detail: "The trail bends east; the air smells of dew and pine",
      goto: "act2-horses",
    },
  ],
};

/* ══════════════════════════ Act II — The Goblin Ambush ══════════════════════════ */

const act2Horses: Scene = {
  id: "act2-horses",
  act: 2,
  title: "Something in the Road",
  location: "Act II · The Triboar Trail, the meadow bend",
  tableau: { setting: "meadow", time: "day", props: ["deadHorses", "arrows", "thicket"] },
  prose:
    "Morning, and the trail bends around a meadow's elbow — and there they are. Two dead horses lie across the road fifty yards ahead, killed days ago and killed hard: black-fletched arrows stand in their hides like a porcupine's quarrel. The saddlebags have been opened, gone through, and left hanging. Flies work the ground in a lazy halo. The horses are Gundren and Sildar's — Maera recognizes the harnesswork from the yard in Neverwinter — and the thickets crowd close on both sides of the road here, close enough to hide a dozen small hungry things. Torvald's knuckles go white on the wagon rail. Nobody has to say it: the wagon cannot pass without moving the horses, and moving the horses means standing in exactly the spot somebody chose for you to stand.",
  choices: [
    {
      id: "search-wreckage",
      label: "Search the wreckage",
      detail: "Elyndra reads the ground with a scholar's patience",
      check: {
        skill: "Investigation",
        dc: 10,
        successScene: "act2-map-case",
        failureScene: "act2-no-case",
        successEffects: [{ kind: "item", item: "mapCase", count: 1 }],
      },
      goto: "act2-map-case",
    },
    {
      id: "watch-treeline",
      label: "Halt the wagon and watch the tree line",
      detail: "Perrin's eyes on the thicket while the meadow holds its breath",
      goto: "act2-wary",
    },
  ],
};

const act2MapCase: Scene = {
  id: "act2-map-case",
  act: 2,
  title: "The Empty Map Case",
  location: "Act II · The ambush site",
  tableau: { setting: "meadow", time: "day", props: ["deadHorses", "arrows", "mapCase"] },
  prose:
    "Blood, but not much of it. The horses were shot from the thickets, at range, and whatever was done to their riders was done elsewhere — there is a drag-line into the brush, days old and cold. Elyndra works the ground with a stick and a scholar's patience and comes up with the morning's true alarm: a torn leather map case, Gundren's, its flap sliced open — and empty. No maps. The dwarf who would not say what he found has lost the only pages that described it. Arrows, a drag-line, an emptied map case. Somewhere ahead of you, someone knows more about your employer than you do, and they took the trouble to carry the knowing away.",
  proseNotes: [
    {
      requires: [{ kind: "sceneSeen", sceneId: "act1-job-read" }],
      text: "Maera's reading in the yard comes back to you: the brothers, the discovery he would not name. The empty case confirms it — this was never about mining supplies.",
    },
  ],
  choices: [
    {
      id: "to-arms-case",
      label: "The thickets move — to arms!",
      detail: "Small hooded shapes rise out of the brush on both flanks",
      battle: { arenaId: "road-ambush" },
      goto: "act2-aftermath",
      gotoFled: "act2-runner",
    },
  ],
};

const act2NoCase: Scene = {
  id: "act2-no-case",
  act: 2,
  title: "A Doorway, Already Swept",
  location: "Act II · The ambush site",
  tableau: { setting: "meadow", time: "day", props: ["deadHorses", "arrows"] },
  prose:
    "Whatever stories this ground could tell, the rain has thumbed most of them out. Elyndra circles twice, cross and thorough, and comes away with little: the horses were shot days ago from the cover of the trees, the saddlebags were searched by small quick hands, and the riders were not killed here — there is a drag-line into the thicket, and it is cold. That is the whole of it. No tracks worth the name, no scrap or drop that tells you who or why. Perrin says the thing everyone is already thinking: 'They knew the wagon would stop. Somebody cleared this ground of everything but the horses.' You are standing in a doorway that was built for you, and it has already been swept.",
  choices: [
    {
      id: "to-arms-nocase",
      label: "The thickets move — to arms!",
      detail: "Small hooded shapes rise out of the brush on both flanks",
      battle: { arenaId: "road-ambush" },
      goto: "act2-aftermath",
      gotoFled: "act2-runner",
    },
  ],
};

const act2Wary: Scene = {
  id: "act2-wary",
  act: 2,
  title: "The Thickets Stop Pretending",
  location: "Act II · The ambush site",
  tableau: { setting: "meadow", time: "day", props: ["thicket", "deadHorses"] },
  prose:
    "You give the meadow a full slow minute, and it gives you nothing back. No glint in the thicket, no shape that will not hold still, no bird going up. Perrin reads the brush the way other people read a page, and even he comes up empty — the near side, at least, is genuinely empty, which means whatever is watching has practiced. Maera's grip shifts on her shield. 'Move the horses,' Torvald says at last, and steps down off the wagon, and that — the moment iron-shod boots touch the chosen ground — is the moment the thickets stop pretending. Small hooded shapes rise out of the brush on both flanks with bows already drawn, and the air fills with the thin rising shriek of goblins who have been waiting all morning for exactly this.",
  choices: [
    {
      id: "to-arms-wary",
      label: "To arms!",
      detail: "Four goblins, two flanking pairs, the wagon your only cover",
      battle: { arenaId: "road-ambush" },
      goto: "act2-aftermath",
      gotoFled: "act2-runner",
    },
  ],
};

const act2Runner: Scene = {
  id: "act2-runner",
  act: 2,
  title: "Eighty Feet of Open Ground",
  location: "Act II · The meadow, the last goblin",
  tableau: { setting: "meadow", time: "day", props: ["arrows", "thicket"] },
  prose:
    "It is over, and it is not. Three goblins are down in the road and the last of them — the one that watched its whole war party fold in three heartbeats — breaks for the tree line with its ears flat and its scimitar gone, shrieking the whole way. It has maybe eighty feet of open ground between it and the brush, and every goblin in earshot will soon know what happened here if it makes the trees. Perrin is already tracking it with his bow, unhurried. Torvald is already moving, faster than a man in chain mail has any right to. It is one heartbeat's decision, and it is yours: spend the arrow, spend the legs, or save both and let the lair learn your faces.",
  choices: [
    {
      id: "shoot-runner",
      label: "Perrin — bring it down",
      detail: "His shortbow speaks across the meadow",
      check: {
        attack: { hero: "perrin", attack: "Shortbow" },
        dc: 15,
        successScene: "act2-runner-down",
        failureScene: "act2-runner-gone",
        failureEffects: [{ kind: "flag", flag: "goblinEscaped", value: true }],
      },
      goto: "act2-runner-down",
    },
    {
      id: "chase-runner",
      label: "Run it down",
      detail: "Torvald leads the chase across open ground",
      check: {
        skill: "Athletics",
        dc: 12,
        successScene: "act2-runner-caught",
        failureScene: "act2-runner-gone",
        failureEffects: [{ kind: "flag", flag: "goblinEscaped", value: true }],
      },
      goto: "act2-runner-caught",
    },
    {
      id: "let-runner-go",
      label: "Let it go",
      detail: "The noise you would make is worth more than the kill",
      effects: [{ kind: "flag", flag: "goblinEscaped", value: true }],
      goto: "act2-runner-gone",
    },
  ],
};

const act2RunnerDown: Scene = {
  id: "act2-runner-down",
  act: 2,
  title: "Nothing Personal",
  location: "Act II · The lip of the meadow grass",
  tableau: { setting: "meadow", time: "day", props: ["arrows"] },
  prose:
    "The bowstring's note is almost lost under the goblin's own shrieking — almost. The arrow takes it between the shoulders at a dead sprint, and it goes down sliding, ploughing a short brown furrow to the very lip of the meadow grass and stopping there, one hand still reaching for the thicket that would have saved it. Perrin lowers the bow and blows out a breath. 'Nothing personal,' he tells the body, and means it, in the way of people who have done this before and made peace with the arithmetic. Nothing that saw this fight will be carrying word of it anywhere. The road behind you is silent, the road ahead is a question mark, and the wagon sits where you left it, patient as furniture, waiting.",
  choices: [
    {
      id: "see-road-down",
      label: "See to the road",
      detail: "Drag the horses clear and read the ground",
      goto: "act2-aftermath",
    },
  ],
};

const act2RunnerGone: Scene = {
  id: "act2-runner-gone",
  act: 2,
  title: "It Makes the Trees",
  location: "Act II · The lip of the meadow grass",
  tableau: { setting: "meadow", time: "day", props: ["thicket"] },
  prose:
    "It makes the trees. Of course it makes the trees — it was born in trees like those and you were not. The last you see is a low grey shape folding itself into the brush without slowing, without looking back, carrying the whole story away northward at a dead run: the wagon, the armored dwarf, the priestess, the fire-thrower, the small one with the bow. Somewhere at the end of that run is a lair that will now be told, in whatever language goblins keep such accounts, exactly who you are and what you cost. Perrin tracks it with the arrow nocked and the string at his cheek and does not loose. Torvald arrives beside him breathing like a bellows. 'Too loud,' the dwarf says, and it is not comfort, it is arithmetic.",
  choices: [
    {
      id: "see-road-gone",
      label: "See to the road",
      detail: "Drag the horses clear and read the ground",
      goto: "act2-aftermath",
    },
  ],
};

const act2RunnerCaught: Scene = {
  id: "act2-runner-caught",
  act: 2,
  title: "The Arithmetic of Being Caught",
  location: "Act II · The open ground north of the road",
  tableau: { setting: "meadow", time: "day", props: ["arrows", "thicket"] },
  prose:
    "Torvald runs it down the way a wall falls on a rat: without hurry, without malice, and with an enormous sense of inevitability. The goblin is faster over the first twenty yards, and it does not matter at all. The dwarf cuts the angle, plants himself in its path like a landed door, and simply takes it out of the air when it tries to swerve — a brief ugly tumble, a squeal, and then Perrin is there with cord from the wagon and a knee between its shoulders. It thrashes, spits, bites the ground, and curses you with a vocabulary that Elyndra finds structurally fascinating and Maera finds exhausting. But it is caught, it is alive, and it knows it — and a goblin that knows it is caught, Perrin says, is a goblin that has just begun to think about the value of cooperation.",
  choices: [
    {
      id: "questions-then",
      label: "Questions, then",
      detail: "Truss it to the wagon wheel and let it think",
      goto: "act2-interrogate",
    },
  ],
};

const act2Interrogate: Scene = {
  id: "act2-interrogate",
  act: 2,
  title: "A Goblin, Trussed and Thinking",
  location: "Act II · The ambush site",
  tableau: { setting: "meadow", time: "day", props: ["deadHorses", "wagon"] },
  prose:
    "It is trussed to the wagon wheel and doing a terrible job of pretending not to be terrified. Up close it is smaller than the fight made it feel — ears like knife handles, eyes like wet river stones, a leather harness stinking of the kennel. Somewhere behind those eyes is everything worth knowing about the trail ahead: where it was running to, who it answers to, what is waiting in the dark at the end of this meadow's story. Maera brings it water, because of course she does, and it drinks, because terror is thirsty work. Then it grins at you with too many teeth, deciding, perhaps, how much of what happens next is going to hurt. It clearly understands gold, knives, and the difference between a question and a threat.",
  choices: [
    {
      id: "torvald-asks",
      label: "Let Torvald do the asking",
      detail: "He does not raise his voice. He does not have to.",
      check: {
        skill: "Intimidation",
        dc: 10,
        successScene: "act2-talks",
        failureScene: "act2-silent",
        successEffects: [{ kind: "flag", flag: "knowsLayout", value: true }],
      },
      goto: "act2-talks",
    },
    {
      id: "perrin-talks",
      label: "Let Perrin do the talking",
      detail: "A friendly story with a hook in it",
      check: {
        skill: "Deception",
        dc: 10,
        successScene: "act2-talks",
        failureScene: "act2-silent",
        successEffects: [{ kind: "flag", flag: "knowsLayout", value: true }],
      },
      goto: "act2-talks",
    },
    {
      id: "skip-interrogation",
      label: "Take its boots and move on",
      detail: "You already know what matters: the trail runs north",
      goto: "act2-aftermath",
    },
  ],
};

const act2Talks: Scene = {
  id: "act2-talks",
  act: 2,
  title: "What the Goblin Knows",
  location: "Act II · The ambush site",
  tableau: { setting: "meadow", time: "day", props: ["deadHorses", "wagon"] },
  prose:
    "It takes the better part of a minute, and it is not the water or the cord that does it — it is the arithmetic. The goblin counts its dead war party, looks at the four of you, and decides the distant master's secrets are cheaper than its own hide. It talks in bursts, in trade-tongue thick with goblin grammar. The trail runs north, up the hill, to a den behind a waterfall: a cave mouth watched from a hidden blind, a kennel of wolves on chains, a pool held back by a dam of sticks and stones. There is a goblin-boss under a bigger boss — 'Klarg,' it says, and mimes something huge crouching — and a prisoner, human, beaten, held high on a ledge for trade. It has never seen the Black Spider. Nobody has.",
  choices: [
    {
      id: "north-then-talks",
      label: "North, then — up the trail",
      detail: "It even points with its chin, for free",
      goto: "act2-aftermath",
    },
  ],
};

const act2Silent: Scene = {
  id: "act2-silent",
  act: 2,
  title: "Brave Today, for Whatever Reason",
  location: "Act II · The ambush site",
  tableau: { setting: "meadow", time: "day", props: ["deadHorses", "wagon"] },
  prose:
    "It laughs at you. That is the hard truth of the next five minutes: you have a captured goblin, and it has decided — on whatever passes for principle among goblins — that today it is brave. It gives you its name (something like 'Ragg'), its rank (nobody), and its opinion of your mothers (extensive, unhurried, strangely poetic). Torvald's questions hit nothing. Perrin's reasonable-man act slides off. Whatever this creature knows about the trail, the den, the wolves or the prisoner on the ledge, it is keeping — out of fear of the thing it calls the Black Spider that outweighs, by some goblin calculus, the fear of you. Maera eventually calls it: 'It will not break. We are wasting the light.' The goblin grins its too-many teeth at her, honestly delighted to be understood.",
  choices: [
    {
      id: "north-then-silent",
      label: "North, then — up the trail",
      detail: "Leave it tied and pointed at the road home",
      goto: "act2-aftermath",
    },
  ],
};

const act2Aftermath: Scene = {
  id: "act2-aftermath",
  act: 2,
  title: "Taking Stock of the Road",
  location: "Act II · The cleared road",
  tableau: { setting: "meadow", time: "day", props: ["deadHorses", "wagon"] },
  prose:
    "The road is yours again, and it is a mess. You drag the horses to the verge by their hocks, workmanlike, three of you hauling while Elyndra points; the flies follow, aggrieved. Then there is a grim half-hour of taking stock. Arrows are collected and compared — black fletching, goblin make, but the heads are good iron, someone else's iron, stolen like everything else in this country. Perrin's hands do the counting while his eyes do the mending; Maera's hands do the mending while her eyes do the counting. The back-trail the goblins used is not hard to find: a churned line of small bootprints and hurrying hooves running north out of the meadow, uphill into the trees, toward whatever hole they came out of. Five miles, the sign says. Maybe less.",
  choices: [
    {
      id: "aftermath-rest",
      label: "Bind wounds before the trail",
      detail: "An hour off the road — short rest",
      requires: [{ kind: "restAvailable" }],
      effects: [{ kind: "shortRest" }],
      goto: "act2-rested",
    },
    {
      id: "aftermath-trail",
      label: "The light is going — take the trail now",
      detail: "The sign is fresh and the goblins are not getting farther",
      goto: "act2-trail",
    },
  ],
};

const act2Rested: Scene = {
  id: "act2-rested",
  act: 2,
  rest: true,
  title: "A Thorn-Screened Hour",
  location: "Act II · The stream-cut off the goblin trail",
  tableau: { setting: "forest", time: "dusk", props: ["campfire"] },
  prose:
    "You take the hour. There is a stream-cut just off the trail, screened by thorn, and the party folds into it like a hand into a glove. Boots off, wounds flushed and closed, the last of Maera's clean linen sacrificed to the cause. Torvald rewinds himself; Perrin naps against a root with his bow strung across his knees; Elyndra copies out the spell that saved the road and mutters at its margins; Maera moves among you like weather, unhurried, inevitable, kind. Nobody says the obvious: that you are stronger now than you were an hour ago, and that whatever waits at the top of this trail will be the day's second, larger argument. Rest is a weapon, and you have just sharpened it.",
  choices: [
    {
      id: "up-trail-rested",
      label: "Up the trail, then",
      detail: "The sign runs north and the light is going",
      goto: "act2-trail",
    },
  ],
};

const act2Trail: Scene = {
  id: "act2-trail",
  act: 2,
  title: "Five Miles, Uphill, Listening",
  location: "Act II · The goblin trail",
  tableau: { setting: "forest", time: "day", props: ["wolfTracks"] },
  prose:
    "The goblin trail is honest, at least. It runs north along a game path gone wrong, and the signs are signs a child of ten could follow: broken ferns at shin height, a dead campfire still warm at its heart, bootprints that argue among themselves. But honest is not the same as easy. The path climbs the whole way, folding back on itself through the pines, and more than once it fords the same little stream going the wrong direction. Perrin walks point with his head down and his ears open. Twice he stops the column with a raised hand, and twice the forest proves him right to — once for a poacher's snare, once for a sound neither of you ever see. Whatever you are walking toward, you are walking toward it uphill, and it is listening for you.",
  choices: [
    {
      id: "follow-trail",
      label: "Follow the trail carefully",
      detail: "Maera reads the sign; the party moves like one quiet animal",
      check: {
        skill: "Survival",
        dc: 10,
        advantageFrom: "Perrin walks point",
        successScene: "act2-trail-quiet",
        failureScene: "act2-trail-spotted",
        failureEffects: [{ kind: "alert", to: 1 }],
      },
      goto: "act2-trail-quiet",
    },
    {
      id: "strike-north",
      label: "Strike north and trust the map in your head",
      detail: "Faster, louder, easier to hear coming",
      effects: [{ kind: "alert", to: 1 }],
      goto: "act2-trail-spotted",
    },
  ],
};

const act2TrailQuiet: Scene = {
  id: "act2-trail-quiet",
  act: 2,
  title: "Downwind, Unwashed by Its Sight",
  location: "Act II · The forested hill above the lair",
  tableau: { setting: "forest", time: "dusk", props: ["wolfTracks", "stream"] },
  prose:
    "Five miles, and the trail never once loses its nerve. You arrive in the last of the light: a steep forested hill, and out of its flank, water — a fair-sized stream pouring from a cave mouth that gapes behind a curtain of green brush, like a wound the hill is trying to bandage. The mouth of the lair. You are above it on the game path, downwind, unwashed by its sight, and from here you can watch the brush move once, briefly, with something that fidgets. A sentry post, small and bored. The stream's steady roar will eat any sound you care to make on the way down, and the evening light puts its hand over your shoulder the whole way. For once, the country seems to be on your side of the argument. It will not stay that way. But tonight, at the door, it is.",
  choices: [
    {
      id: "down-quiet",
      label: "Down to the water — quietly",
      detail: "The roar of the falls will cover you",
      goto: "act2-arrival",
    },
  ],
};

const act2TrailSpotted: Scene = {
  id: "act2-trail-spotted",
  act: 2,
  title: "You Are Expected",
  location: "Act II · The forested hill above the lair",
  tableau: { setting: "forest", time: "dusk", props: ["thicket", "stream"] },
  prose:
    "Five miles, and the trail wins. Somewhere in the third mile the game path forks and the sign argues, and by the time you have settled the argument you have paid for the schooling: you have announced yourselves. A whistle answers a whistle, a bird that is not a bird; you find a watching-place of packed earth behind you on the trail, still warm. From the last rise you see the lair anyway — a hill like a clenched fist, water pouring from a cave mouth behind a screen of brush — but the quality of the evening has changed. You are expected now. Whatever this evening was going to be, it is going to be it with the goblins forewarned, the watch set, and every advantage of surprise spent buying you a wrong turn on a hillside. Torvald says what everyone is thinking: 'Right. Knock loud, then.'",
  choices: [
    {
      id: "down-spotted",
      label: "Down to the water",
      detail: "No hiding it now — the door knows you are coming",
      goto: "act2-arrival",
    },
  ],
};

const act2Arrival: Scene = {
  id: "act2-arrival",
  act: 2,
  title: "The Mouth of Cragmaw Hideout",
  location: "Act II · The stream below the falls",
  tableau: { setting: "hideout", time: "dusk", props: ["caveMouth", "stream", "brush"] },
  prose:
    "Close to, it is bigger than the trail promised. The hill leans over you, furred with dark pine, and the stream comes out of its flank in a bright hurt, falling into a pool that has no business being that quiet. The cave mouth behind the water is tall enough to drive the wagon through, and it is hidden well — a curtain of brush on ropes, and behind the curtain dark, and out of the dark the sound of water and chains and something breathing that is not water. This is the mouth of Cragmaw Hideout, and everyone in it owes loyalty to something they call the Black Spider. Between you and the mouth: broken ground, the pool, the brush, and whoever is on watch behind it. Behind you: five miles of trail and the road home. The party settles, and breathes, and looks at itself.",
  choices: [
    {
      id: "take-stock",
      label: "Take stock of what the road taught you",
      detail: "The party reaches level 2 — the milestone applies",
      effects: [{ kind: "levelUp" }],
      goto: "act2-levelup",
    },
    {
      id: "count-arrows",
      label: "Count arrows, cinch straps, breathe",
      detail: "A last moment of quiet — and the road still pays out",
      effects: [{ kind: "levelUp" }],
      goto: "act2-levelup",
    },
  ],
};

const act2LevelUp: Scene = {
  id: "act2-levelup",
  act: 2,
  milestone: true,
  title: "The Party the Road Was Building",
  location: "Act II · The stream below the falls",
  tableau: { setting: "hideout", time: "dusk", props: ["caveMouth", "stream"] },
  prose:
    "Something changes at the water's edge, and all four of you feel it at once — the road behind you, paid for in blood and lessons, settling into your hands like a new grip on an old tool. Torvald plants his feet and finds a second wind inside the first one: an extra heartbeat of war in him now, banked, waiting for the moment the fight needs it most. Perrin stops moving like a rogue and starts moving like a knife drawn already. Maera's morning prayers come back with an extra verse, a third channel of Lathander's attention. And Elyndra — Elyndra has been folding distance into her mind for five uphill miles, and the fold is finished now. The party that limps down to this stream is not the party that was hired in Neverwinter. It is the party the road was building instead.",
  choices: [
    {
      id: "onward-door",
      label: "Onward — the hideout waits",
      detail: "The dungeon opens in Session 4",
      goto: "act3-door",
    },
    {
      id: "look-back",
      label: "Look back down the trail once",
      detail: "The meadow is a smudge of gold behind the pines",
      goto: "act3-door",
    },
  ],
};

/* ══════════════════════════ Act III — the door (Session 4 continues from here) ══════════════════════════ */

const act3Door: Scene = {
  id: "act3-door",
  act: 3,
  title: "The Door Keeps",
  location: "Act III · Cragmaw Hideout, the threshold",
  tableau: { setting: "hideout", time: "dusk", props: ["caveMouth", "stream", "brush"] },
  prose:
    "The door of Cragmaw Hideout stands in front of you, pouring out its river, and for a long moment nobody moves. There are two ways into a place like this, and you can see neither of them safely from here: the obvious mouth behind its curtain of brush, and somewhere above, Elyndra insists, a wetter way in behind the twin falls. The captured goblin's account — blind, kennel, dam, Klarg — waits in your memory like a stolen map, if you ever got one. Above the pool an evening bird calls once and quits. The stream keeps pouring. The chains keep breathing. The door is not going to open itself, but it is going to keep. One more breath first.",
  proseNotes: [
    {
      requires: [{ kind: "flag", flag: "knowsLayout" }],
      text: "You have the goblin's map in your heads: the blind by the mouth, the chained wolves, the dam above the stream passage, Klarg below. The hideout does not know you know.",
    },
  ],
  choices: [
    {
      id: "plan-the-way-in",
      label: "Sit by the stream and plan the way in",
      detail: "Professionals take five minutes; it is cheaper than the alternative",
      goto: "act3-plan",
    },
    {
      id: "end-session-here",
      label: "Rest here — end the session at the door",
      detail: "Session 4 opens the dungeon; the build continues from this threshold",
      effects: [{ kind: "title" }],
      goto: "act3-door",
    },
  ],
};

const act3Plan: Scene = {
  id: "act3-plan",
  act: 3,
  title: "Planning Like Professionals",
  location: "Act III · Cragmaw Hideout, the wet stones",
  tableau: { setting: "hideout", time: "night", props: ["stream", "caveMouth"] },
  prose:
    "You sit on the wet stones with the roar in your ears and plan like professionals, which by now you are. Perrin sketches the ground with a knife-tip: pool, brush, the blind he is sure is there. Torvald sketches the opposite — where he will stand when it goes wrong. Maera's plan is a supply plan, because someone has to be the adult: potions, rations, who carries the light. Elyndra is quiet the longest, watching the water come out of the hill, doing whatever mathematics elves do about falling water and rising trouble. Three ways in, one hostage somewhere above the water, and a name — Klarg — that the trail has been repeating since the meadow. The sun goes off the pool. It is time. The hideout itself opens in Session 4; the build continues from this door.",
  choices: [
    {
      id: "return-to-title",
      label: "Return to the title screen",
      detail: "The run is saved at the threshold — Session 4 opens the dungeon",
      effects: [{ kind: "title" }],
      goto: "act3-plan",
    },
  ],
};

/* ══════════════════════════ The scene registry ══════════════════════════ */

/** Every scene the story runner can visit, keyed by id. */
export const STORY_SCENES: Record<string, Scene> = Object.fromEntries(
  [
    act1Job,
    act1JobRead,
    act1JobEase,
    act1Road,
    act1Camp,
    act1CampRest,
    act2Horses,
    act2MapCase,
    act2NoCase,
    act2Wary,
    act2Runner,
    act2RunnerDown,
    act2RunnerGone,
    act2RunnerCaught,
    act2Interrogate,
    act2Talks,
    act2Silent,
    act2Aftermath,
    act2Rested,
    act2Trail,
    act2TrailQuiet,
    act2TrailSpotted,
    act2Arrival,
    act2LevelUp,
    act3Door,
    act3Plan,
  ].map((scene) => [scene.id, scene])
);

/** Where New Game begins (GDD §6.1: the job offer opens Act I). */
export const FIRST_SCENE_ID = "act1-job";

export function getScene(id: string): Scene {
  const scene = STORY_SCENES[id];
  if (!scene) throw new Error(`Unknown scene: ${id}`);
  return scene;
}

/** Items the Acts I–II content can grant or consume (linter reference). */
export const STORY_ITEM_IDS: readonly ItemId[] = ["potion", "ration", "mapCase"];
