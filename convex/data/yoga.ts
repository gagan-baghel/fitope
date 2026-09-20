/**
 * Yoga asana library, A–Z by English name.
 *
 * Kept apart from `exercises.ts` because asanas carry two things a lift does not: a Sanskrit
 * name people actually search by, and a hold measured in seconds rather than reps. Rows:
 * english | sanskrit | primary | secondary | equipment | pattern | difficulty | holdSec | cues
 *
 * `pattern` uses the yoga vocabulary (standing / balance / seated / forward-fold / backbend /
 * twist / inversion / restorative / core / flow) so a sequence can be built by shape.
 */
const ROWS = `
Boat Pose|Paripurna Navasana|core|quads,back|mat|core|intermediate|30|Sit tall, lift the chest before the feet;Shins parallel to the floor, or knees bent if the back rounds;Breathe steadily — do not hold your breath
Bound Angle Pose|Baddha Konasana|mobility|glutes|mat|seated|beginner|60|Soles of the feet together, heels a comfortable distance away;Hinge from the hips, not the middle back;Let the knees fall, never push them down
Bow Pose|Dhanurasana|back|chest,quads|mat|backbend|intermediate|20|Grip the ankles from the outside;Kick the feet back into the hands rather than pulling;Lift chest and thighs together, breathe into the ribs
Bridge Pose|Setu Bandha Sarvangasana|glutes|hamstrings,back|mat|backbend|beginner|45|Feet hip-width, heels under the knees;Press the feet down and lift the hips, chin away from the chest;Roll down one vertebra at a time
Camel Pose|Ustrasana|chest|back,quads|mat|backbend|intermediate|25|Shins down, hips stacked over the knees;Lift the chest first, reach back second;Hands on the heels or the lower back — both are the full pose
Cat-Cow|Marjaryasana Bitilasana|mobility|core,back|mat|flow|beginner|60|Wrists under shoulders, knees under hips;Inhale to arch, exhale to round;Move one vertebra at a time, no rushing
Chair Pose|Utkatasana|quads|glutes,shoulders|mat|standing|beginner|30|Sit the hips back as if to a chair behind you;Weight in the heels, knees behind the toes;Ribs down, arms alongside the ears
Child's Pose|Balasana|mobility|back|mat|restorative|beginner|90|Knees wide, big toes touching;Reach the hands long, forehead heavy;Breathe into the back of the ribs
Cobra Pose|Bhujangasana|back|chest,shoulders|mat|backbend|beginner|20|Hands under the shoulders, elbows hugged in;Peel the chest up using the back, not the arms;Shoulders down, neck long
Corpse Pose|Savasana|mobility||mat|restorative|beginner|300|Lie flat, arms a little away from the body, palms up;Let the feet roll open;Stay for at least five minutes — this is the pose, not the break
Cow Face Pose|Gomukhasana|shoulders|glutes|mat,strap|seated|intermediate|45|Stack the knees if the hips allow, otherwise cross the shins;Top elbow up, bottom hand climbing — use a strap between them;Keep the ribs from flaring
Crescent Lunge|Ashta Chandrasana|quads|glutes,core|mat|standing|beginner|30|Back heel lifted, hips square to the front;Front knee over the ankle;Tuck the tailbone before reaching the arms up
Crow Pose|Bakasana|core|shoulders,chest|mat|balance|advanced|15|Knees high onto the back of the upper arms;Round the upper back and look slightly forward, not down;Shift weight forward until the feet float — one at a time first
Dancer Pose|Natarajasana|quads|back,shoulders|mat|balance|advanced|20|Find a still point to look at before you move;Kick the lifted foot into the hand;Chest lifts as the leg rises, hips stay level
Downward-Facing Dog|Adho Mukha Svanasana|hamstrings|shoulders,back,calves|mat|flow|beginner|45|Hands shoulder-width, index fingers forward;Bend the knees freely — a long spine beats straight legs;Press the floor away, heels reach down without forcing
Eagle Pose|Garudasana|shoulders|quads,calves|mat|balance|intermediate|25|Cross thigh over thigh, then wrap the foot if it comes;Arms cross at the elbows, lift the elbows to shoulder height;Sit down into it, gaze fixed
Easy Pose|Sukhasana|mobility||mat|seated|beginner|120|Sit on a folded blanket so the hips sit above the knees;Shins crossed, not ankles stacked on the floor;Crown lifts, shoulders soften
Extended Hand-to-Big-Toe|Utthita Hasta Padangusthasana|hamstrings|core,quads|mat,strap|balance|advanced|20|Draw the knee in first, then extend;Use a strap around the foot rather than rounding the back;Standing leg strong, hips level
Extended Side Angle|Utthita Parsvakonasana|quads|core,shoulders|mat,block|standing|intermediate|30|Front knee over the ankle, back leg straight and strong;Forearm on the thigh or hand to a block;One long line from the back heel to the top hand
Fish Pose|Matsyasana|chest|back,shoulders|mat|backbend|intermediate|30|Forearms under the body, lift the chest;Crown rests lightly — no weight through the neck;Legs stay active
Garland Pose|Malasana|quads|glutes,mobility|mat,block|seated|beginner|45|Feet a little wider than the hips, toes turned out;Heels down, or sit on a block;Elbows press the knees open, chest tall
Half Lord of the Fishes|Ardha Matsyendrasana|back|core,shoulders|mat|twist|intermediate|30|Sit tall before you twist — length first, rotation second;Twist from the ribs, not the neck;Both sitting bones stay down
Half Moon Pose|Ardha Chandrasana|glutes|core,hamstrings|mat,block|balance|intermediate|25|Hand to a block about a foot ahead of the standing foot;Stack the top hip over the bottom;Flex the lifted foot, press out through the heel
Happy Baby|Ananda Balasana|mobility|glutes|mat|restorative|beginner|60|Hold the outer feet, knees toward the armpits;Shins vertical, ankles over knees;Press the tailbone down, rock gently if it helps
Head-to-Knee Forward Bend|Janu Sirsasana|hamstrings|back|mat,strap|forward-fold|beginner|60|One leg long, the other sole to the inner thigh;Turn the chest to the straight leg before folding;Lead with the sternum, not the forehead
Headstand|Salamba Sirsasana|shoulders|core,back|mat,wall|inversion|advanced|30|Learn this at a wall with someone watching;Forearms down, weight in the forearms — not the head;Come out the moment the neck complains
Hero Pose|Virasana|quads|mobility|mat,block|seated|beginner|60|Sit between the heels, or on a block if the knees object;Toes pointing straight back;Stop immediately if there is knee pain
High Plank|Kumbhakasana|core|chest,shoulders|mat|core|beginner|45|Shoulders stacked over the wrists;Heels reach back, crown reaches forward;Ribs knit down so the low back stays long
Legs-Up-the-Wall|Viparita Karani|mobility||mat,wall|restorative|beginner|300|Hips a few inches from the wall;Arms open, jaw soft;The easiest way to end any practice
Locust Pose|Salabhasana|back|glutes,shoulders|mat|backbend|beginner|25|Lift chest, arms and legs on one breath;Reach the toes back rather than squeezing them up;Neck stays in line with the spine
Lotus Pose|Padmasana|mobility||mat|seated|advanced|60|Only if the hips open freely — the rotation comes from the hip, never the knee;Half lotus is the honest version for most people;Spine tall, hands resting easy
Low Lunge|Anjaneyasana|quads|glutes,chest|mat|standing|beginner|45|Back knee down, pad it if the floor is hard;Tuck the tailbone to feel the front of the back hip;Only then lift the chest and the arms
Pigeon Pose|Eka Pada Rajakapotasana|glutes|mobility|mat,block|seated|intermediate|90|Front shin angled to whatever the hip allows;Support the front hip on a block so both sides stay level;Fold forward slowly and breathe
Plow Pose|Halasana|back|hamstrings,shoulders|mat|inversion|advanced|30|Come from shoulderstand, never by throwing the legs;Hands support the back;Never turn the head while you are in it
Revolved Triangle|Parivrtta Trikonasana|hamstrings|core,back|mat,block|twist|advanced|25|Shorten the stance first, square the hips second;Bottom hand to a block outside the front foot;Lengthen the spine on every inhale, rotate on every exhale
Reclined Bound Angle|Supta Baddha Konasana|mobility||mat|restorative|beginner|180|Soles together, knees falling open;Support each thigh so nothing has to hold itself;Stay long enough for the hips to let go
Reclined Twist|Supta Matsyendrasana|back|core,glutes|mat|twist|beginner|60|Knees drop to one side, shoulders stay down;Turn the head the other way only if the neck is happy;A slow, quiet exhale is the whole point
Seated Forward Bend|Paschimottanasana|hamstrings|back,calves|mat,strap|forward-fold|intermediate|60|Sit up on a folded blanket to un-tuck the pelvis;Hinge from the hips with a long spine;A strap around the feet beats a rounded back
Shoulderstand|Salamba Sarvangasana|shoulders|core,back|mat|inversion|advanced|45|Fold a blanket under the shoulders, head off it;Hands support the mid-back, elbows shoulder-width;Skip it entirely with any neck history
Sphinx Pose|Salamba Bhujangasana|back|chest|mat|backbend|beginner|60|Forearms parallel, elbows under the shoulders;Draw the chest forward between the arms;A gentle, sustained backbend — no straining
Staff Pose|Dandasana|core|back,quads|mat|seated|beginner|45|Legs long, feet flexed, thighs pressing down;Sit on a folded blanket so the pelvis stacks upright;Hands beside the hips, press down to lift the chest
Standing Forward Fold|Uttanasana|hamstrings|back,calves|mat,block|forward-fold|beginner|45|Bend the knees as much as you need;Fold from the hips, belly to the thighs;Let the head hang heavy
Airplane Pose|Dekasana|glutes|core,hamstrings|mat|balance|beginner|25|Hinge forward with the arms back like wings;Hips stay level, lifted foot flexed;The honest way into Warrior III
Dolphin Plank Pose|Makara Adho Mukha Svanasana|core|shoulders,back|mat|core|beginner|30|Forearms parallel, elbows under the shoulders;One line from heels to crown;Drop the knees before the hips sag
Four-Limbed Staff Pose|Chaturanga Dandasana|chest|triceps,core|mat|core|intermediate|15|Shift forward onto the toes before you bend;Elbows stay pinned to the ribs at 90 degrees;Knees down is the version that builds the pose
Standing Figure Four|Eka Pada Utkatasana|glutes|quads,core|mat|balance|beginner|30|Ankle across the opposite thigh, foot flexed;Sit back as if into a chair;Hands at the chest, gaze on one fixed point
Sun Salutation A|Surya Namaskar A|mobility|core,shoulders|mat|flow|beginner|0|One movement per breath;Inhale to lengthen, exhale to fold;Build from three rounds to twelve
Sun Salutation B|Surya Namaskar B|mobility|quads,shoulders|mat|flow|intermediate|0|Chair, chaturanga, up dog, down dog, warrior one;Keep the breath even as the pace picks up;Five rounds is a full practice on its own
Supported Fish|Matsyasana (Salamba)|chest|shoulders|mat,block|restorative|beginner|120|One block under the shoulder blades, one under the head;Arms open wide;Let gravity do all of it
Thread the Needle|Parsva Balasana|shoulders|back|mat|twist|beginner|60|From all fours, slide one arm under the body;Let the shoulder and the side of the head rest down;Five slow breaths each side
Tree Pose|Vrksasana|glutes|core,calves|mat|balance|beginner|40|Foot to the ankle, calf or inner thigh — never the side of the knee;Press foot and leg into each other;Fix your eyes on one unmoving point
Triangle Pose|Utthita Trikonasana|hamstrings|core,shoulders|mat,block|standing|beginner|35|Straight front leg, hand to shin or block — not the knee;Open the chest to the ceiling;Reach long through the crown
Upward-Facing Dog|Urdhva Mukha Svanasana|back|chest,shoulders|mat|backbend|intermediate|20|Thighs and knees lift clear of the floor;Shoulders over the wrists, drawn down and back;Press the floor away rather than sinking into the low back
Upward Plank|Purvottanasana|back|glutes,shoulders|mat|backbend|intermediate|20|Fingers pointing toward the feet;Lift the hips until the body is one line;Let the head follow the chest, do not drop it back
Warrior I|Virabhadrasana I|quads|glutes,shoulders|mat|standing|beginner|35|Back foot at about 45 degrees, hips turning forward;Front knee tracks over the second toe;Ribs down before the arms go up
Warrior II|Virabhadrasana II|quads|glutes,shoulders|mat|standing|beginner|40|Front heel lines up with the back arch;Front thigh works toward parallel;Shoulders stack over the hips, gaze past the front hand
Warrior III|Virabhadrasana III|hamstrings|core,glutes,back|mat,block|balance|advanced|20|Shorten the lift until the hips stay level;Reach forward through the crown and back through the heel;Blocks under the hands make this a learnable pose
Wheel Pose|Urdhva Dhanurasana|back|chest,shoulders,quads|mat|backbend|advanced|15|Warm the shoulders and hip flexors first, properly;Press evenly through hands and feet;Come down with a tucked chin, one vertebra at a time
Wide-Angle Seated Forward Bend|Upavistha Konasana|hamstrings|back|mat|forward-fold|intermediate|60|Legs as wide as the hamstrings allow, kneecaps up;Walk the hands forward with a long spine;Sit on a blanket if the pelvis tips back
Wide-Legged Forward Fold|Prasarita Padottanasana|hamstrings|back,shoulders|mat,block|forward-fold|beginner|45|Feet parallel, outer edges pressing down;Hinge from the hips, crown toward the floor;A block under the head turns this into a rest
`.trim();

export type SeedYoga = {
  name: string;
  sanskrit: string;
  searchName: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  category: "yoga";
  pattern: string;
  difficulty: string;
  holdSec: number;
  instructions: string[];
};

const list = (s: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

export const SEED_YOGA: SeedYoga[] = ROWS.split("\n")
  .map((line) => {
    const [name, sanskrit, primary, secondary, equipment, pattern, difficulty, holdSec, cues] = line.split("|");
    return {
      name,
      sanskrit,
      // Both names are searchable: people look for "pigeon" and for "kapotasana".
      searchName: `${name} ${sanskrit} ${primary} yoga asana`.toLowerCase(),
      primaryMuscles: list(primary),
      secondaryMuscles: list(secondary),
      equipment: list(equipment),
      category: "yoga" as const,
      pattern,
      difficulty,
      holdSec: Number(holdSec),
      instructions: cues.split(";").map((c) => c.trim()),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

/** The shapes a balanced sequence moves through, in the order a class actually uses them. */
export const YOGA_PATTERNS = [
  "flow",
  "standing",
  "balance",
  "core",
  "backbend",
  "twist",
  "forward-fold",
  "seated",
  "inversion",
  "restorative",
] as const;

/**
 * Mobility rows from the original library that this one supersedes, as `old name -> new name`.
 * The seeder upgrades those rows in place rather than inserting a second, near-identical
 * entry: the ids stay valid, so any plan or logged set that already points at them survives,
 * and the library does not end up listing the same pose twice under two categories.
 */
export const YOGA_SUPERSEDES: Record<string, string> = {
  "Downward Dog": "Downward-Facing Dog",
  "Cat Cow": "Cat-Cow",
  "Surya Namaskar": "Sun Salutation A",
  "Child's Pose": "Child's Pose",
  "Pigeon Pose": "Pigeon Pose",
  "Thread the Needle": "Thread the Needle",
};

/* ------------------------------ sequence builder -------------------------- */

/**
 * Three sequences that between them cover the library. Each entry is a shape and how many
 * poses of it to take, in the order a class actually moves through them: warm, then
 * standing/strong, then floor, then rest.
 */
export const YOGA_SEQUENCES: {
  title: string;
  focus: string;
  minutes: number;
  shape: { pattern: string; count: number }[];
}[] = [
  {
    title: "Morning Flow",
    focus: "mobility, full body",
    minutes: 25,
    shape: [
      { pattern: "flow", count: 2 },
      { pattern: "standing", count: 3 },
      { pattern: "balance", count: 1 },
      { pattern: "backbend", count: 1 },
      { pattern: "forward-fold", count: 1 },
      { pattern: "restorative", count: 1 },
    ],
  },
  {
    title: "Strength & Balance",
    focus: "core, glutes, shoulders",
    minutes: 30,
    shape: [
      { pattern: "flow", count: 1 },
      { pattern: "standing", count: 3 },
      { pattern: "balance", count: 2 },
      { pattern: "core", count: 2 },
      { pattern: "backbend", count: 1 },
      { pattern: "twist", count: 1 },
      { pattern: "restorative", count: 1 },
    ],
  },
  {
    title: "Evening Restore",
    focus: "mobility, recovery",
    minutes: 20,
    shape: [
      { pattern: "seated", count: 1 },
      { pattern: "forward-fold", count: 2 },
      { pattern: "twist", count: 2 },
      { pattern: "restorative", count: 3 },
    ],
  },
];

export const DIFFICULTY_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Shapes that are the same on both sides, so one round covers them. */
const SYMMETRIC = new Set(["flow", "core", "restorative", "seated", "inversion", "backbend"]);

type Pose = { name: string; pattern: string; difficulty: string; holdSec?: number; sanskrit?: string };

/**
 * Picks the poses for one sequence out of a library. Pure, so the self-check can prove every
 * sequence fills at every experience level before a user ever generates one.
 *
 * Prefers the hardest pose the stated level allows; if archiving has left too few at that
 * level it tops up from harder ones rather than handing back a short day.
 */
export function buildSequence<T extends Pose>(
  poses: T[],
  shape: { pattern: string; count: number }[],
  experience: string
) {
  const ceiling = DIFFICULTY_RANK[experience] ?? 0;
  const used = new Set<T>();
  const out: { pose: T; sets: number; reps: string; restSec: number; notes: string }[] = [];
  const byEase = (a: T, b: T) => (DIFFICULTY_RANK[a.difficulty] ?? 0) - (DIFFICULTY_RANK[b.difficulty] ?? 0);
  for (const { pattern, count } of shape) {
    const ofShape = poses.filter((p) => p.pattern === pattern && !used.has(p));
    const allowed = ofShape.filter((p) => (DIFFICULTY_RANK[p.difficulty] ?? 0) <= ceiling).sort(byEase).reverse();
    const rest = ofShape.filter((p) => (DIFFICULTY_RANK[p.difficulty] ?? 0) > ceiling).sort(byEase);
    for (const pose of [...allowed, ...rest].slice(0, count)) {
      used.add(pose);
      const hold = pose.holdSec ?? 45;
      out.push({
        pose,
        // Asymmetric shapes are done on both sides; symmetric ones once.
        sets: SYMMETRIC.has(pose.pattern) ? 1 : 2,
        reps: hold > 0 ? `${hold}s hold` : "5 rounds",
        restSec: 15,
        notes: pose.sanskrit ?? pattern,
      });
    }
  }
  return out;
}
