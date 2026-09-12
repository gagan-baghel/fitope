/**
 * Shared exercise library.
 * Compact rows: name | primary | secondary | equipment | category | pattern | difficulty | cues
 */
const ROWS = `
Barbell Back Squat|quads,glutes|hamstrings,core|barbell,rack|strength|squat|intermediate|Brace hard before you unrack;Sit between your hips, knees tracking over toes;Drive the floor away, hips and chest rise together
Barbell Front Squat|quads|glutes,core,upper back|barbell,rack|strength|squat|advanced|Keep elbows high through the whole rep;Stay upright, let the knees travel forward;Squat to depth you can control
Goblet Squat|quads,glutes|core|dumbbell,kettlebell|strength|squat|beginner|Hold the weight at chest height;Sit straight down between the hips;Elbows brush the inside of the knees at the bottom
Bulgarian Split Squat|quads,glutes|hamstrings|dumbbell,bench|strength|squat|intermediate|Rear foot on the bench, front foot far enough forward;Drop the back knee straight down;Push through the whole front foot
Walking Lunge|quads,glutes|hamstrings,core|dumbbell,bodyweight|strength|squat|beginner|Step out far enough that the front shin stays vertical;Keep the torso tall;Push off the front heel into the next step
Leg Press|quads,glutes|hamstrings|machine|strength|squat|beginner|Feet mid-platform, shoulder width;Lower until hips start to tuck, no further;Never lock the knees hard at the top
Hack Squat|quads|glutes|machine|strength|squat|intermediate|Back flat on the pad;Control the descent for 2-3 seconds;Drive evenly through both feet
Leg Extension|quads||machine|strength|isolation|beginner|Line the knee up with the machine pivot;Squeeze at the top for a beat;Lower under control
Conventional Deadlift|hamstrings,glutes|back,core,traps|barbell|strength|hinge|advanced|Bar over mid-foot, shins almost touching;Take the slack out before you pull;Push the floor away and finish with the glutes, not the lower back
Romanian Deadlift|hamstrings,glutes|back|barbell,dumbbell|strength|hinge|intermediate|Soft knees, hips travel back;Bar stays against the legs;Stop when the hamstrings stop, not when the floor does
Trap Bar Deadlift|glutes,quads|hamstrings,back|trap bar|strength|hinge|beginner|Stand in the centre of the bar;Chest up, pull the slack out;Stand up tall, don't lean back
Hip Thrust|glutes|hamstrings|barbell,bench|strength|hinge|beginner|Shoulder blades on the bench edge;Tuck the ribs down;Full lockout, pause one second
Good Morning|hamstrings|glutes,back|barbell|strength|hinge|advanced|Light weight, this is a hinge not a squat;Push hips back with a flat spine;Stop when the back would round
Kettlebell Swing|glutes,hamstrings|core,shoulders|kettlebell|strength|hinge|intermediate|Hike the bell back like a snap pass;Snap the hips, the arms are just rope;Bell floats to chest height, no higher
Seated Leg Curl|hamstrings||machine|strength|isolation|beginner|Pad just above the heels;Curl fully, pause;Resist on the way back
Nordic Curl|hamstrings|glutes|bodyweight|strength|isolation|advanced|Anchor the ankles well;Lower as slowly as you can control;Use hands to push back up
Standing Calf Raise|calves||machine,dumbbell|strength|isolation|beginner|Full stretch at the bottom;Rise all the way onto the toes;Pause 1s at the top
Barbell Bench Press|chest|triceps,shoulders|barbell,bench|strength|push|intermediate|Shoulder blades pinned down and back;Bar touches the lower chest;Press slightly back toward the eyes
Incline Dumbbell Press|chest,shoulders|triceps|dumbbell,bench|strength|push|beginner|Bench at 30 degrees, not higher;Elbows around 45 degrees from the body;Press up and slightly together
Dumbbell Flat Press|chest|triceps,shoulders|dumbbell,bench|strength|push|beginner|Wrists stacked over elbows;Lower until you feel a stretch;Drive up without clanging the bells
Push-Up|chest|triceps,core,shoulders|bodyweight|strength|push|beginner|Body in one straight line;Elbows tucked to roughly 45 degrees;Full lockout each rep
Dip|chest,triceps|shoulders|parallel bars|strength|push|intermediate|Lean forward for chest, upright for triceps;Descend to upper arms parallel;Don't shrug at the bottom
Cable Chest Fly|chest||cable|strength|isolation|beginner|Slight bend in the elbows, locked;Hug the arms together in an arc;Squeeze for a beat at the front
Machine Chest Press|chest|triceps|machine|strength|push|beginner|Handles level with the mid-chest;Press without locking harshly;Control the return
Overhead Press|shoulders|triceps,core|barbell|strength|push|intermediate|Squeeze the glutes to stop the lean-back;Push the head through once the bar passes;Lock out with biceps by the ears
Seated Dumbbell Shoulder Press|shoulders|triceps|dumbbell,bench|strength|push|beginner|Back supported, ribs down;Press in a slight arc;Lower to ear height
Lateral Raise|shoulders||dumbbell,cable|strength|isolation|beginner|Lead with the elbow, not the hand;Stop at shoulder height;Lower slowly, no swinging
Rear Delt Fly|shoulders|upper back|dumbbell,cable,machine|strength|isolation|beginner|Hinge forward, chest down;Think of pulling the arms apart;Light weight, high reps
Face Pull|shoulders,upper back||cable|strength|pull|beginner|Rope at eye height;Pull to the forehead, elbows high;Externally rotate at the end
Arnold Press|shoulders|triceps|dumbbell|strength|push|intermediate|Start palms facing you;Rotate as you press;Reverse the path exactly on the way down
Pull-Up|back|biceps,core|pull-up bar|strength|pull|intermediate|Start from a dead hang;Pull the elbows to the ribs;Chin clearly over the bar
Chin-Up|back,biceps||pull-up bar|strength|pull|intermediate|Underhand, shoulder-width grip;Drive elbows down and back;Control the negative
Lat Pulldown|back|biceps|cable,machine|strength|pull|beginner|Chest tall, slight lean back;Pull to the collarbone;Let the lats stretch fully at the top
Barbell Row|back|biceps,hamstrings|barbell|strength|pull|intermediate|Hinge to about 45 degrees and stay there;Pull to the lower ribs;No jerking with the lower back
Single-Arm Dumbbell Row|back|biceps|dumbbell,bench|strength|pull|beginner|Flat back, hand and knee on the bench;Pull the elbow past the ribs;Full stretch at the bottom
Seated Cable Row|back|biceps|cable|strength|pull|beginner|Sit tall, knees soft;Pull to the belly button;Don't let the torso rock
Chest-Supported Row|back|biceps,upper back|dumbbell,machine,bench|strength|pull|beginner|Chest stays glued to the pad;Squeeze the shoulder blades;Slow the eccentric
T-Bar Row|back|biceps|barbell|strength|pull|intermediate|Neutral spine, chest up;Row to the sternum;Keep the knees soft
Straight-Arm Pulldown|back||cable|strength|isolation|beginner|Arms locked long;Sweep the bar to the thighs;Feel the lats, not the triceps
Barbell Curl|biceps|forearms|barbell|strength|isolation|beginner|Elbows pinned at the sides;No hip swing;Squeeze hard at the top
Dumbbell Hammer Curl|biceps,forearms||dumbbell|strength|isolation|beginner|Neutral grip throughout;Elbows stay still;Lower for 2 seconds
Incline Dumbbell Curl|biceps||dumbbell,bench|strength|isolation|intermediate|Let the arms hang behind the body;Curl without moving the shoulder;Full stretch each rep
Cable Curl|biceps||cable|strength|isolation|beginner|Constant tension, no rest at the bottom;Elbows fixed;Controlled tempo
Triceps Pushdown|triceps||cable|strength|isolation|beginner|Elbows glued to the ribs;Lock out fully;Return only to 90 degrees
Overhead Cable Extension|triceps||cable|strength|isolation|beginner|Long stretch behind the head;Elbows point forward;Extend without flaring
Skull Crusher|triceps||barbell,dumbbell,bench|strength|isolation|intermediate|Lower to the forehead or just behind;Upper arms stay angled back;Elbows in
Close-Grip Bench Press|triceps|chest,shoulders|barbell,bench|strength|push|intermediate|Grip just inside shoulder width;Tuck the elbows;Touch the lower chest
Plank|core||bodyweight|core|core|beginner|Elbows under shoulders;Squeeze glutes, tuck the ribs;Breathe, don't sag
Side Plank|core||bodyweight|core|core|beginner|Stack the feet and hips;Push the floor away;Hips stay high
Hanging Leg Raise|core||pull-up bar|core|core|advanced|No swinging;Curl the pelvis, don't just lift the legs;Lower slowly
Cable Crunch|core||cable|core|core|beginner|Hips stay still;Crunch the ribs to the pelvis;Resist the return
Dead Bug|core||bodyweight|core|core|beginner|Low back stays pressed down;Opposite arm and leg;Slow and quiet
Bird Dog|core|glutes,back|bodyweight|core|core|beginner|Reach long, don't lift high;Keep hips square;Pause 2s each rep
Russian Twist|core||bodyweight,dumbbell|core|core|beginner|Lean back to tension, not collapse;Rotate from the ribs;Feet can stay down
Ab Wheel Rollout|core||ab wheel|core|core|advanced|Ribs down, glutes tight;Roll only as far as you can keep a flat back;Pull back with the abs
Mountain Climber|core|shoulders|bodyweight|core|conditioning|beginner|Shoulders over wrists;Drive knees without bouncing hips;Steady rhythm
Farmer Carry|core,forearms|traps,glutes|dumbbell,kettlebell|strength|carry|beginner|Stand tall, shoulders down;Small quick steps;Don't lean away from the weight
Treadmill Run|cardio||treadmill|cardio|conditioning|beginner|Warm up 5 minutes easy;Hold a pace you could speak short sentences at;Cool down walking
Outdoor Run|cardio||bodyweight|cardio|conditioning|beginner|Start easy for 5 minutes;Land under your hips;Finish easier than you started
Cycling|cardio||bike|cardio|conditioning|beginner|Saddle height so the knee stays slightly bent;Steady cadence around 85 rpm;Keep the upper body relaxed
Rowing Machine|cardio,back|legs|rower|cardio|conditioning|intermediate|Legs, then back, then arms;Reverse that order coming back;Drive with the legs, not the arms
Jump Rope|cardio,calves||jump rope|cardio|conditioning|beginner|Small jumps, wrists do the work;Stay on the balls of the feet;Break into intervals if needed
Burpee|cardio|chest,quads|bodyweight|cardio|conditioning|intermediate|Chest to floor;Jump the feet in, not step;Land softly
Stair Climber|cardio,glutes|quads|machine|cardio|conditioning|beginner|Stand tall, light hands on the rail;Full steps, no tiptoeing;Steady pace
Incline Treadmill Walk|cardio||treadmill|cardio|conditioning|beginner|10-12% incline, comfortable speed;Hands off the rails;30-45 minutes easy
Battle Ropes|cardio,shoulders|core|ropes|cardio|conditioning|intermediate|Athletic stance;Short hard intervals;Breathe out on the effort
Cat Cow|mobility||bodyweight|mobility|core|beginner|Move one vertebra at a time;Inhale to arch, exhale to round;Slow, no forcing
World's Greatest Stretch|mobility||bodyweight|mobility|core|beginner|Lunge, elbow to instep;Rotate open and reach;Hold 3 breaths per side
90/90 Hip Switch|mobility||bodyweight|mobility|core|beginner|Sit tall between switches;Move slowly;Don't use the hands if you can avoid it
Couch Stretch|mobility||bodyweight|mobility|core|intermediate|Rear foot up on a wall or couch;Tuck the pelvis;90 seconds per side
Downward Dog|mobility||bodyweight|mobility|core|beginner|Push the floor away;Pedal the heels;Long spine over straight legs
Child's Pose|mobility||bodyweight|mobility|core|beginner|Knees wide, big toes together;Reach long;Breathe into the back
Thread the Needle|mobility||bodyweight|mobility|core|beginner|Slide one arm under the body;Let the shoulder settle;Hold 5 breaths
Wall Slide|mobility,shoulders||bodyweight|mobility|core|beginner|Back and arms on the wall;Slide up without arching;Small range done well
Hip Flexor Stretch|mobility||bodyweight|mobility|core|beginner|Half kneeling, glute squeezed;Push the hip forward, not the back;Hold 45s
Pigeon Pose|mobility||bodyweight|mobility|core|intermediate|Front shin angled comfortably;Square the hips;Breathe out the tension
Surya Namaskar|mobility,cardio|core|bodyweight|mobility|conditioning|beginner|Move with the breath;One round both sides;Build to 6-12 rounds
Machine Shoulder Press|shoulders|triceps|machine|strength|push|beginner|Seat so the handles sit at shoulder height;Press without shrugging;Control down
Pec Deck|chest||machine|strength|isolation|beginner|Elbows at chest height;Squeeze slowly;Don't slam the stack
Assisted Pull-Up|back|biceps|machine|strength|pull|beginner|Use the least assistance you can manage;Full hang each rep;Chin over bar
Inverted Row|back|biceps,core|barbell,rack|strength|pull|beginner|Body straight, heels down;Pull the chest to the bar;Lower slowly
Shrug|traps||barbell,dumbbell|strength|isolation|beginner|Straight up, not rolling;Pause at the top;No neck straining
Reverse Curl|forearms,biceps||barbell,dumbbell|strength|isolation|beginner|Overhand grip;Elbows still;Light weight
Wrist Curl|forearms||dumbbell|strength|isolation|beginner|Forearms on the thighs;Full range;High reps
Glute Bridge|glutes|hamstrings|bodyweight|strength|hinge|beginner|Feet close to the hips;Tuck the ribs;Squeeze 2s at the top
Cable Kickback|glutes||cable|strength|isolation|beginner|Hinge slightly forward;Push the heel back;Squeeze without arching the back
Step-Up|quads,glutes|hamstrings|box,dumbbell|strength|squat|beginner|Box at knee height;Don't push off the trailing leg;Control the way down
Box Jump|quads,glutes|calves|box|strength|conditioning|intermediate|Land softly in a quarter squat;Step down, never jump down;Quality over height
Sled Push|quads,glutes|calves,core|sled|cardio|conditioning|intermediate|Low body angle, arms locked;Short powerful steps;Keep the sled moving
Pallof Press|core||cable|core|core|beginner|Stand side-on to the cable;Press out without rotating;Resist, don't move
Hollow Hold|core||bodyweight|core|core|intermediate|Low back pressed into the floor;Legs and shoulders just off the ground;Shorten the lever if you shake
Copenhagen Plank|core||bench|core|core|advanced|Top leg on the bench;Hips high;Start with short holds
Reverse Hyperextension|glutes,hamstrings|back|machine,bench|strength|hinge|intermediate|Control the swing;Squeeze the glutes at the top;Don't hyperextend the back
Back Extension|back,glutes|hamstrings|bench|strength|hinge|beginner|Hinge at the hips;Stop level with the body;Slow both directions
Landmine Press|shoulders|chest,core|barbell|strength|push|intermediate|Half kneeling or standing;Press up and slightly across;Ribs down
Zercher Squat|quads,core|glutes,upper back|barbell|strength|squat|advanced|Bar in the elbow crease, use a pad;Stay upright;Brace hard
Pendlay Row|back|biceps,hamstrings|barbell|strength|pull|advanced|Bar resets on the floor every rep;Explosive pull to the sternum;Flat back throughout
Cable Lateral Raise|shoulders||cable|strength|isolation|beginner|Cable from behind the body;Lead with the elbow;Constant tension
Preacher Curl|biceps||barbell,dumbbell,bench|strength|isolation|beginner|Armpits into the top of the pad;Don't fully lock the elbow at the bottom;Squeeze at the top
Cable Woodchop|core||cable|core|core|intermediate|Rotate through the ribs, hips follow;Arms stay long;Control the return
Suitcase Carry|core,forearms|glutes|dumbbell,kettlebell|strength|carry|beginner|One side only;Stay perfectly upright;Slow, deliberate steps
Elliptical|cardio||machine|cardio|conditioning|beginner|Upright posture;Steady resistance;20-40 minutes
Swimming|cardio|back,shoulders|pool|cardio|conditioning|intermediate|Warm up two easy lengths;Breathe on a rhythm;Rest as needed between sets
Brisk Walk|cardio||bodyweight|cardio|conditioning|beginner|Fast enough to breathe deeper;Arms swinging naturally;20-60 minutes
Yoga Flow|mobility|core|bodyweight|mobility|conditioning|beginner|Breath leads the movement;Never force a range;Finish lying still for 2 minutes
`.trim();

export type SeedExercise = {
  name: string;
  searchName: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  category: string;
  pattern: string;
  difficulty: string;
  instructions: string[];
};

const list = (s: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

export const SEED_EXERCISES: SeedExercise[] = ROWS.split("\n").map((line) => {
  const [name, primary, secondary, equipment, category, pattern, difficulty, cues] = line.split("|");
  return {
    name,
    searchName: `${name} ${primary} ${equipment} ${category}`.toLowerCase(),
    primaryMuscles: list(primary),
    secondaryMuscles: list(secondary),
    equipment: list(equipment),
    category,
    pattern,
    difficulty,
    instructions: cues.split(";").map((c) => c.trim()),
  };
});
