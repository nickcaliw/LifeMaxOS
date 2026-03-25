// Comprehensive exercise library for workout tracking
// 200+ exercises with muscle targeting, equipment, and form cues

export const MUSCLE_GROUPS = [
  "chest", "back", "lats", "quads", "hamstrings", "glutes",
  "front_delts", "lateral_delts", "rear_delts",
  "biceps", "triceps", "forearms", "abs", "calves", "traps"
];

export const EQUIPMENT_TYPES = [
  "barbell", "dumbbell", "cable", "machine", "bodyweight",
  "smith_machine", "kettlebell", "bands", "ez_bar"
];

export const EXERCISES = [
  // ─────────────────────────────────────────────
  // CHEST (~15)
  // ─────────────────────────────────────────────
  {
    id: "barbell_bench_press",
    name: "Barbell Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Retract your scapulae, plant your feet, and press the bar from mid-chest to lockout while maintaining an arch.",
    defaultRest: 150
  },
  {
    id: "incline_barbell_bench_press",
    name: "Incline Barbell Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Set the bench to 30-45 degrees, retract your scapulae, and press the bar from upper chest to lockout.",
    defaultRest: 150
  },
  {
    id: "decline_barbell_bench_press",
    name: "Decline Barbell Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Secure your legs on the decline bench, retract scapulae, and press the bar from lower chest to lockout.",
    defaultRest: 150
  },
  {
    id: "dumbbell_bench_press",
    name: "Dumbbell Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Retract your scapulae, press the dumbbells up from chest level with a slight arc, and squeeze at the top.",
    defaultRest: 120
  },
  {
    id: "incline_dumbbell_bench_press",
    name: "Incline Dumbbell Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Set bench to 30-45 degrees and press dumbbells from upper chest to lockout with controlled tempo.",
    defaultRest: 120
  },
  {
    id: "dumbbell_fly",
    name: "Dumbbell Fly",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "fly",
    instructions: "With a slight bend in your elbows, lower the dumbbells in a wide arc until you feel a deep chest stretch, then squeeze back up.",
    defaultRest: 75
  },
  {
    id: "incline_dumbbell_fly",
    name: "Incline Dumbbell Fly",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "fly",
    instructions: "On an incline bench, open your arms in a wide arc with a slight elbow bend, focusing on the upper chest stretch.",
    defaultRest: 75
  },
  {
    id: "cable_crossover",
    name: "Cable Crossover",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts"],
    equipment: "cable",
    category: "isolation",
    movement: "fly",
    instructions: "Step forward with pulleys set high, bring handles together in a hugging motion, and squeeze your chest at the bottom.",
    defaultRest: 60
  },
  {
    id: "low_cable_fly",
    name: "Low Cable Fly",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts"],
    equipment: "cable",
    category: "isolation",
    movement: "fly",
    instructions: "With pulleys set low, bring handles up and together in front of your chest, targeting the upper pecs.",
    defaultRest: 60
  },
  {
    id: "machine_chest_press",
    name: "Machine Chest Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "machine",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Adjust the seat so handles align with mid-chest, press forward to full extension, and control the return.",
    defaultRest: 120
  },
  {
    id: "pec_deck_fly",
    name: "Pec Deck Fly",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts"],
    equipment: "machine",
    category: "isolation",
    movement: "fly",
    instructions: "Sit with arms at chest height on the pads and squeeze them together in front of you with a controlled tempo.",
    defaultRest: 60
  },
  {
    id: "push_up",
    name: "Push Up",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps", "abs"],
    equipment: "bodyweight",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Keep your body in a straight plank, lower your chest to the floor with elbows at 45 degrees, and push back up.",
    defaultRest: 90
  },
  {
    id: "smith_machine_bench_press",
    name: "Smith Machine Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "smith_machine",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Position the bench so the bar path hits mid-chest, unrack, lower with control, and press to lockout.",
    defaultRest: 120
  },
  {
    id: "dip_chest",
    name: "Dip (Chest)",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_push",
    instructions: "Lean forward about 30 degrees, lower until your upper arms are parallel to the floor, then press back up.",
    defaultRest: 120
  },
  {
    id: "landmine_press",
    name: "Landmine Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Hold the end of the barbell at chest height and press it up and away from you in an arcing path.",
    defaultRest: 120
  },

  // ─────────────────────────────────────────────
  // BACK (~20)
  // ─────────────────────────────────────────────
  {
    id: "barbell_row",
    name: "Barbell Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Hinge at the hips to about 45 degrees, pull the bar to your lower chest, and squeeze your shoulder blades together.",
    defaultRest: 150
  },
  {
    id: "pendlay_row",
    name: "Pendlay Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Start each rep from a dead stop on the floor with a flat back, explosively row to your lower chest.",
    defaultRest: 150
  },
  {
    id: "dumbbell_row",
    name: "Dumbbell Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "dumbbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Brace one hand on a bench, keep your back flat, and row the dumbbell to your hip while squeezing your lat.",
    defaultRest: 120
  },
  {
    id: "pull_up",
    name: "Pull Up",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps", "forearms"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Hang with an overhand grip slightly wider than shoulders, pull your chest to the bar, and lower with control.",
    defaultRest: 150
  },
  {
    id: "chin_up",
    name: "Chin Up",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps", "forearms"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Hang with a supinated (underhand) grip at shoulder width and pull your chin above the bar.",
    defaultRest: 150
  },
  {
    id: "lat_pulldown",
    name: "Lat Pulldown",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps", "rear_delts"],
    equipment: "cable",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Sit with thighs secured, pull the bar to your upper chest while driving your elbows down and back.",
    defaultRest: 120
  },
  {
    id: "close_grip_lat_pulldown",
    name: "Close Grip Lat Pulldown",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps"],
    equipment: "cable",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Use a V-bar or close-grip handle, lean back slightly, and pull to your chest focusing on lat contraction.",
    defaultRest: 120
  },
  {
    id: "seated_cable_row",
    name: "Seated Cable Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "cable",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Sit upright with feet braced, pull the handle to your lower chest, and retract your shoulder blades fully.",
    defaultRest: 120
  },
  {
    id: "t_bar_row",
    name: "T-Bar Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Straddle the bar, grip the handles, hinge forward, and row the weight to your chest with a flat back.",
    defaultRest: 150
  },
  {
    id: "chest_supported_row",
    name: "Chest Supported Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "dumbbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Lie face down on an incline bench and row both dumbbells up, squeezing your shoulder blades at the top.",
    defaultRest: 120
  },
  {
    id: "cable_pullover",
    name: "Cable Pullover",
    primaryMuscle: "lats",
    secondaryMuscles: ["chest", "abs"],
    equipment: "cable",
    category: "isolation",
    movement: "vertical_pull",
    instructions: "Stand facing a high pulley, keep arms nearly straight, and pull the bar in an arc from overhead to your thighs.",
    defaultRest: 75
  },
  {
    id: "straight_arm_pulldown",
    name: "Straight Arm Pulldown",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "abs"],
    equipment: "cable",
    category: "isolation",
    movement: "vertical_pull",
    instructions: "With arms nearly locked out, push the bar down from shoulder height to your thighs while engaging your lats.",
    defaultRest: 75
  },
  {
    id: "single_arm_cable_row",
    name: "Single Arm Cable Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "cable",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Stand or kneel and row one handle to your hip, rotating your torso slightly for a full lat contraction.",
    defaultRest: 90
  },
  {
    id: "machine_row",
    name: "Machine Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps"],
    equipment: "machine",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Sit with chest against the pad, grip the handles, and pull them toward you while squeezing your back.",
    defaultRest: 120
  },
  {
    id: "inverted_row",
    name: "Inverted Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "bodyweight",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Hang under a bar with your body straight, pull your chest to the bar, and lower with control.",
    defaultRest: 90
  },
  {
    id: "meadows_row",
    name: "Meadows Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Stand perpendicular to a landmine, grip the end of the bar with one hand, and row explosively to your hip.",
    defaultRest: 120
  },
  {
    id: "rack_pull",
    name: "Rack Pull",
    primaryMuscle: "back",
    secondaryMuscles: ["traps", "glutes", "hamstrings", "forearms"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Set the bar at knee height in a rack, grip it, brace your core, and stand up by driving your hips forward.",
    defaultRest: 180
  },
  {
    id: "dumbbell_pullover",
    name: "Dumbbell Pullover",
    primaryMuscle: "lats",
    secondaryMuscles: ["chest", "triceps"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "vertical_pull",
    instructions: "Lie across a bench, lower a dumbbell behind your head with slightly bent arms, then pull it back over your chest.",
    defaultRest: 75
  },
  {
    id: "reverse_grip_lat_pulldown",
    name: "Reverse Grip Lat Pulldown",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps"],
    equipment: "cable",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Use a supinated grip on the pulldown bar, lean back slightly, and pull to your upper chest.",
    defaultRest: 120
  },
  {
    id: "seal_row",
    name: "Seal Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps", "rear_delts"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Lie face down on an elevated bench with the barbell below and row it to the bench, eliminating momentum.",
    defaultRest: 120
  },

  // ─────────────────────────────────────────────
  // QUADS (~12)
  // ─────────────────────────────────────────────
  {
    id: "barbell_back_squat",
    name: "Barbell Back Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings", "abs"],
    equipment: "barbell",
    category: "compound",
    movement: "squat",
    instructions: "Place the bar on your upper traps, brace your core, squat to at least parallel, and drive up through your heels.",
    defaultRest: 180
  },
  {
    id: "barbell_front_squat",
    name: "Barbell Front Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "abs"],
    equipment: "barbell",
    category: "compound",
    movement: "squat",
    instructions: "Rack the bar on your front delts with elbows high, sit straight down to depth, and drive up keeping your torso upright.",
    defaultRest: 180
  },
  {
    id: "goblet_squat",
    name: "Goblet Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "abs"],
    equipment: "dumbbell",
    category: "compound",
    movement: "squat",
    instructions: "Hold a dumbbell at your chest, sit your hips down between your knees, and stand back up tall.",
    defaultRest: 120
  },
  {
    id: "leg_press",
    name: "Leg Press",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "machine",
    category: "compound",
    movement: "squat",
    instructions: "Place your feet shoulder-width on the platform, lower the sled until your knees are at 90 degrees, then press up without locking out.",
    defaultRest: 150
  },
  {
    id: "hack_squat",
    name: "Hack Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
    equipment: "machine",
    category: "compound",
    movement: "squat",
    instructions: "Place your back against the pad, feet shoulder-width, squat down to parallel, and press back up.",
    defaultRest: 150
  },
  {
    id: "leg_extension",
    name: "Leg Extension",
    primaryMuscle: "quads",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "extension",
    instructions: "Sit with the pad on your shins just above your ankles, extend your legs fully, and squeeze your quads at the top.",
    defaultRest: 60
  },
  {
    id: "bulgarian_split_squat",
    name: "Bulgarian Split Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "dumbbell",
    category: "compound",
    movement: "lunge",
    instructions: "Place your rear foot on a bench behind you, hold dumbbells, and lunge down until your front thigh is parallel.",
    defaultRest: 120
  },
  {
    id: "walking_lunge",
    name: "Walking Lunge",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "dumbbell",
    category: "compound",
    movement: "lunge",
    instructions: "Step forward into a deep lunge, drive through your front heel to stand, and immediately step into the next lunge.",
    defaultRest: 120
  },
  {
    id: "smith_machine_squat",
    name: "Smith Machine Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "smith_machine",
    category: "compound",
    movement: "squat",
    instructions: "Position your feet slightly forward, squat to parallel with the bar on your traps, and press back up.",
    defaultRest: 150
  },
  {
    id: "sissy_squat",
    name: "Sissy Squat",
    primaryMuscle: "quads",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "squat",
    instructions: "Hold a support for balance, lean back while bending your knees forward, and lower until you feel a deep quad stretch.",
    defaultRest: 75
  },
  {
    id: "step_up",
    name: "Step Up",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "dumbbell",
    category: "compound",
    movement: "lunge",
    instructions: "Place one foot on a box, drive through that heel to step up fully, and lower back down with control.",
    defaultRest: 90
  },
  {
    id: "reverse_lunge",
    name: "Reverse Lunge",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "dumbbell",
    category: "compound",
    movement: "lunge",
    instructions: "Step backward into a lunge, lower your back knee toward the floor, and drive through your front heel to return.",
    defaultRest: 90
  },

  // ─────────────────────────────────────────────
  // HAMSTRINGS (~10)
  // ─────────────────────────────────────────────
  {
    id: "romanian_deadlift",
    name: "Romanian Deadlift",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Push your hips back with a slight knee bend, lower the bar along your legs until you feel a deep hamstring stretch, then squeeze your glutes to stand.",
    defaultRest: 150
  },
  {
    id: "dumbbell_romanian_deadlift",
    name: "Dumbbell Romanian Deadlift",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
    equipment: "dumbbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Hold dumbbells in front of your thighs, hinge at the hips, and lower until you feel a stretch in your hamstrings.",
    defaultRest: 120
  },
  {
    id: "lying_leg_curl",
    name: "Lying Leg Curl",
    primaryMuscle: "hamstrings",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "curl",
    instructions: "Lie face down, position the pad just above your heels, and curl the weight up by squeezing your hamstrings.",
    defaultRest: 60
  },
  {
    id: "seated_leg_curl",
    name: "Seated Leg Curl",
    primaryMuscle: "hamstrings",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "curl",
    instructions: "Sit with the pad behind your ankles, curl your legs under the seat, and squeeze your hamstrings at full contraction.",
    defaultRest: 60
  },
  {
    id: "stiff_leg_deadlift",
    name: "Stiff Leg Deadlift",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Keep your legs nearly straight, hinge at the hips, lower the bar toward the floor, and return by contracting your hamstrings and glutes.",
    defaultRest: 150
  },
  {
    id: "single_leg_romanian_deadlift",
    name: "Single Leg Romanian Deadlift",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
    equipment: "dumbbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Balance on one leg, hinge forward while extending the other leg behind you, and return to standing.",
    defaultRest: 90
  },
  {
    id: "nordic_hamstring_curl",
    name: "Nordic Hamstring Curl",
    primaryMuscle: "hamstrings",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "curl",
    instructions: "Kneel with your ankles secured, slowly lower your torso toward the floor using your hamstrings to control the descent.",
    defaultRest: 90
  },
  {
    id: "good_morning",
    name: "Good Morning",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Place the bar on your upper back, push your hips back while keeping your back flat, then squeeze your glutes to stand.",
    defaultRest: 120
  },
  {
    id: "kettlebell_swing",
    name: "Kettlebell Swing",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back", "abs"],
    equipment: "kettlebell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Hinge at the hips, swing the kettlebell between your legs, then snap your hips forward to propel it to chest height.",
    defaultRest: 90
  },
  {
    id: "cable_pull_through",
    name: "Cable Pull Through",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes"],
    equipment: "cable",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Face away from a low cable, reach through your legs to grab the rope, hinge forward, then stand by driving your hips through.",
    defaultRest: 90
  },

  // ─────────────────────────────────────────────
  // GLUTES (~8)
  // ─────────────────────────────────────────────
  {
    id: "hip_thrust",
    name: "Hip Thrust",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Sit with your upper back against a bench, roll the bar over your hips, and thrust upward until your hips are fully extended.",
    defaultRest: 120
  },
  {
    id: "dumbbell_hip_thrust",
    name: "Dumbbell Hip Thrust",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "dumbbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Sit against a bench with a dumbbell on your lap and thrust your hips upward, squeezing your glutes at the top.",
    defaultRest: 120
  },
  {
    id: "glute_bridge",
    name: "Glute Bridge",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "bodyweight",
    category: "isolation",
    movement: "hip_hinge",
    instructions: "Lie on your back with knees bent, drive through your heels to lift your hips, and squeeze your glutes at the top.",
    defaultRest: 60
  },
  {
    id: "cable_kickback",
    name: "Cable Kickback",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "cable",
    category: "isolation",
    movement: "extension",
    instructions: "Attach an ankle cuff to a low cable, face the machine, and kick your leg straight back while squeezing your glute.",
    defaultRest: 60
  },
  {
    id: "sumo_squat",
    name: "Sumo Squat",
    primaryMuscle: "glutes",
    secondaryMuscles: ["quads", "hamstrings"],
    equipment: "dumbbell",
    category: "compound",
    movement: "squat",
    instructions: "Stand with a wide stance and toes pointed out, hold a dumbbell between your legs, and squat deep.",
    defaultRest: 120
  },
  {
    id: "machine_hip_abduction",
    name: "Machine Hip Abduction",
    primaryMuscle: "glutes",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "raise",
    instructions: "Sit in the machine with pads on the outside of your knees and push your legs apart against the resistance.",
    defaultRest: 60
  },
  {
    id: "banded_clamshell",
    name: "Banded Clamshell",
    primaryMuscle: "glutes",
    secondaryMuscles: [],
    equipment: "bands",
    category: "isolation",
    movement: "rotation",
    instructions: "Lie on your side with a band above your knees, keep feet together, and open your top knee against the resistance.",
    defaultRest: 45
  },
  {
    id: "barbell_sumo_deadlift",
    name: "Barbell Sumo Deadlift",
    primaryMuscle: "glutes",
    secondaryMuscles: ["quads", "hamstrings", "back"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Take a wide stance with toes pointed out, grip the bar between your legs, and stand up by driving your hips through.",
    defaultRest: 180
  },

  // ─────────────────────────────────────────────
  // FRONT DELTS (~5)
  // ─────────────────────────────────────────────
  {
    id: "overhead_press",
    name: "Overhead Press",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["lateral_delts", "triceps"],
    equipment: "barbell",
    category: "compound",
    movement: "vertical_push",
    instructions: "Unrack the bar at your collarbones, brace your core, and press straight overhead to lockout.",
    defaultRest: 150
  },
  {
    id: "dumbbell_shoulder_press",
    name: "Dumbbell Shoulder Press",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["lateral_delts", "triceps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "vertical_push",
    instructions: "Sit or stand with dumbbells at shoulder height and press them overhead until your arms are fully extended.",
    defaultRest: 120
  },
  {
    id: "arnold_press",
    name: "Arnold Press",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["lateral_delts", "triceps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "vertical_push",
    instructions: "Start with palms facing you at shoulder height, rotate your palms outward as you press up to full lockout.",
    defaultRest: 120
  },
  {
    id: "front_raise",
    name: "Front Raise",
    primaryMuscle: "front_delts",
    secondaryMuscles: [],
    equipment: "dumbbell",
    category: "isolation",
    movement: "raise",
    instructions: "Hold dumbbells at your sides and raise them in front of you to shoulder height with a slight elbow bend.",
    defaultRest: 60
  },
  {
    id: "cable_front_raise",
    name: "Cable Front Raise",
    primaryMuscle: "front_delts",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "raise",
    instructions: "Face away from a low cable, grip the handle at your side, and raise your arm to shoulder height in front of you.",
    defaultRest: 60
  },

  // ─────────────────────────────────────────────
  // LATERAL DELTS (~5)
  // ─────────────────────────────────────────────
  {
    id: "dumbbell_lateral_raise",
    name: "Dumbbell Lateral Raise",
    primaryMuscle: "lateral_delts",
    secondaryMuscles: ["front_delts"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "raise",
    instructions: "With a slight elbow bend, raise the dumbbells out to your sides until your arms are parallel to the floor.",
    defaultRest: 60
  },
  {
    id: "cable_lateral_raise",
    name: "Cable Lateral Raise",
    primaryMuscle: "lateral_delts",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "raise",
    instructions: "Stand beside a low cable, grab the handle with the far hand, and raise your arm out to the side to shoulder height.",
    defaultRest: 60
  },
  {
    id: "machine_lateral_raise",
    name: "Machine Lateral Raise",
    primaryMuscle: "lateral_delts",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "raise",
    instructions: "Sit in the machine with pads against your upper arms and raise them out to the sides against the resistance.",
    defaultRest: 60
  },
  {
    id: "upright_row",
    name: "Upright Row",
    primaryMuscle: "lateral_delts",
    secondaryMuscles: ["front_delts", "traps"],
    equipment: "barbell",
    category: "compound",
    movement: "raise",
    instructions: "Grip the bar with a shoulder-width grip and pull it up along your body, leading with your elbows to chin height.",
    defaultRest: 90
  },
  {
    id: "dumbbell_upright_row",
    name: "Dumbbell Upright Row",
    primaryMuscle: "lateral_delts",
    secondaryMuscles: ["front_delts", "traps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "raise",
    instructions: "Hold dumbbells in front of your thighs and pull them up by leading with your elbows to shoulder height.",
    defaultRest: 90
  },

  // ─────────────────────────────────────────────
  // REAR DELTS (~5)
  // ─────────────────────────────────────────────
  {
    id: "face_pull",
    name: "Face Pull",
    primaryMuscle: "rear_delts",
    secondaryMuscles: ["traps", "back"],
    equipment: "cable",
    category: "isolation",
    movement: "horizontal_pull",
    instructions: "Set a cable at face height with a rope, pull toward your face while externally rotating your shoulders.",
    defaultRest: 60
  },
  {
    id: "reverse_pec_deck",
    name: "Reverse Pec Deck",
    primaryMuscle: "rear_delts",
    secondaryMuscles: ["traps", "back"],
    equipment: "machine",
    category: "isolation",
    movement: "fly",
    instructions: "Sit facing the pad, grip the handles with arms extended, and open your arms back while squeezing your rear delts.",
    defaultRest: 60
  },
  {
    id: "bent_over_dumbbell_reverse_fly",
    name: "Bent Over Dumbbell Reverse Fly",
    primaryMuscle: "rear_delts",
    secondaryMuscles: ["traps", "back"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "fly",
    instructions: "Hinge forward at the hips, let dumbbells hang below, then raise them out to the sides squeezing your rear delts.",
    defaultRest: 60
  },
  {
    id: "cable_reverse_fly",
    name: "Cable Reverse Fly",
    primaryMuscle: "rear_delts",
    secondaryMuscles: ["traps", "back"],
    equipment: "cable",
    category: "isolation",
    movement: "fly",
    instructions: "Set cables at shoulder height, cross the handles, and pull them apart by squeezing your rear delts.",
    defaultRest: 60
  },
  {
    id: "band_pull_apart",
    name: "Band Pull Apart",
    primaryMuscle: "rear_delts",
    secondaryMuscles: ["traps", "back"],
    equipment: "bands",
    category: "isolation",
    movement: "fly",
    instructions: "Hold a band at arms length in front of you and pull it apart by retracting your shoulder blades.",
    defaultRest: 45
  },

  // ─────────────────────────────────────────────
  // BICEPS (~12)
  // ─────────────────────────────────────────────
  {
    id: "barbell_curl",
    name: "Barbell Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "barbell",
    category: "isolation",
    movement: "curl",
    instructions: "Stand with arms extended, curl the bar up by squeezing your biceps, and lower with control without swinging.",
    defaultRest: 75
  },
  {
    id: "dumbbell_curl",
    name: "Dumbbell Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Curl the dumbbells up with your palms facing forward, squeezing at the top, and lower under control.",
    defaultRest: 60
  },
  {
    id: "hammer_curl",
    name: "Hammer Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Hold dumbbells with a neutral (palms facing in) grip and curl them up, keeping your elbows pinned to your sides.",
    defaultRest: 60
  },
  {
    id: "incline_dumbbell_curl",
    name: "Incline Dumbbell Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Sit on an incline bench with arms hanging, curl the dumbbells up while keeping your upper arms stationary.",
    defaultRest: 60
  },
  {
    id: "preacher_curl",
    name: "Preacher Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "ez_bar",
    category: "isolation",
    movement: "curl",
    instructions: "Rest your upper arms on the preacher pad, curl the EZ bar up, and lower slowly to get a full stretch.",
    defaultRest: 60
  },
  {
    id: "cable_curl",
    name: "Cable Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "cable",
    category: "isolation",
    movement: "curl",
    instructions: "Stand facing a low cable with a straight or EZ bar attachment and curl with constant tension.",
    defaultRest: 60
  },
  {
    id: "concentration_curl",
    name: "Concentration Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Sit with your elbow braced against your inner thigh, curl the dumbbell up, and squeeze at the peak.",
    defaultRest: 60
  },
  {
    id: "ez_bar_curl",
    name: "EZ Bar Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "ez_bar",
    category: "isolation",
    movement: "curl",
    instructions: "Grip the angled portions of the EZ bar, keep your elbows at your sides, and curl the bar up with control.",
    defaultRest: 75
  },
  {
    id: "spider_curl",
    name: "Spider Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Lie face down on an incline bench with your arms hanging straight and curl the dumbbells up for a peak contraction.",
    defaultRest: 60
  },
  {
    id: "cable_hammer_curl",
    name: "Cable Hammer Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "cable",
    category: "isolation",
    movement: "curl",
    instructions: "Use a rope attachment on a low cable, keep a neutral grip, and curl up while squeezing your biceps.",
    defaultRest: 60
  },
  {
    id: "machine_bicep_curl",
    name: "Machine Bicep Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "curl",
    instructions: "Sit in the machine with arms on the pad, grip the handles, and curl toward your shoulders.",
    defaultRest: 60
  },
  {
    id: "bayesian_curl",
    name: "Bayesian Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "curl",
    instructions: "Face away from a low cable, let your arm extend behind you, and curl forward for a deep stretch and contraction.",
    defaultRest: 60
  },

  // ─────────────────────────────────────────────
  // TRICEPS (~12)
  // ─────────────────────────────────────────────
  {
    id: "close_grip_bench_press",
    name: "Close Grip Bench Press",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "front_delts"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Grip the bar with hands shoulder-width apart, keep elbows tucked, and press from chest to lockout.",
    defaultRest: 120
  },
  {
    id: "tricep_pushdown",
    name: "Tricep Pushdown",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "extension",
    instructions: "Stand at a high cable with a straight bar, pin your elbows to your sides, and push the bar down to full extension.",
    defaultRest: 60
  },
  {
    id: "rope_pushdown",
    name: "Rope Pushdown",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "extension",
    instructions: "Use a rope attachment, push down and split the rope at the bottom while squeezing your triceps.",
    defaultRest: 60
  },
  {
    id: "overhead_tricep_extension",
    name: "Overhead Tricep Extension",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "dumbbell",
    category: "isolation",
    movement: "extension",
    instructions: "Hold a dumbbell overhead with both hands, lower it behind your head by bending your elbows, then extend back up.",
    defaultRest: 75
  },
  {
    id: "cable_overhead_tricep_extension",
    name: "Cable Overhead Tricep Extension",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "extension",
    instructions: "Face away from a low cable with a rope, start with hands behind your head, and extend your arms overhead.",
    defaultRest: 75
  },
  {
    id: "skull_crusher",
    name: "Skull Crusher",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "ez_bar",
    category: "isolation",
    movement: "extension",
    instructions: "Lie on a bench, hold the EZ bar above you, lower it to your forehead by bending only at the elbows, then extend.",
    defaultRest: 75
  },
  {
    id: "dip_tricep",
    name: "Dip (Tricep)",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "front_delts"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_push",
    instructions: "Keep your torso upright, lower yourself until your elbows reach 90 degrees, and press back up to lockout.",
    defaultRest: 120
  },
  {
    id: "kickback",
    name: "Kickback",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "dumbbell",
    category: "isolation",
    movement: "extension",
    instructions: "Hinge forward with your upper arm parallel to the floor, extend the dumbbell back until your arm is straight.",
    defaultRest: 60
  },
  {
    id: "diamond_push_up",
    name: "Diamond Push Up",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "front_delts"],
    equipment: "bodyweight",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Place your hands close together forming a diamond shape and perform a push up with elbows close to your body.",
    defaultRest: 90
  },
  {
    id: "single_arm_cable_pushdown",
    name: "Single Arm Cable Pushdown",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "extension",
    instructions: "Use a single handle on a high cable, pin your elbow, and push down to full tricep extension.",
    defaultRest: 60
  },
  {
    id: "jm_press",
    name: "JM Press",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "A hybrid between a close-grip bench and skull crusher: lower the bar toward your chin, then press back up.",
    defaultRest: 120
  },
  {
    id: "bench_dip",
    name: "Bench Dip",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "front_delts"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_push",
    instructions: "Place your hands on a bench behind you, lower your body by bending your elbows, and press back up.",
    defaultRest: 75
  },

  // ─────────────────────────────────────────────
  // ABS (~10)
  // ─────────────────────────────────────────────
  {
    id: "cable_crunch",
    name: "Cable Crunch",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "curl",
    instructions: "Kneel facing a high cable with a rope behind your head and crunch down by contracting your abs.",
    defaultRest: 60
  },
  {
    id: "hanging_leg_raise",
    name: "Hanging Leg Raise",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "raise",
    instructions: "Hang from a bar and raise your legs to at least 90 degrees while minimizing any swinging.",
    defaultRest: 60
  },
  {
    id: "plank",
    name: "Plank",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "press",
    instructions: "Hold a push-up position on your forearms, keeping your body in a straight line from head to heels.",
    defaultRest: 60
  },
  {
    id: "ab_wheel_rollout",
    name: "Ab Wheel Rollout",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "extension",
    instructions: "Kneel with the ab wheel in front of you, roll forward as far as you can control, then pull back using your abs.",
    defaultRest: 75
  },
  {
    id: "bicycle_crunch",
    name: "Bicycle Crunch",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "rotation",
    instructions: "Lie on your back, alternate bringing each elbow to the opposite knee in a pedaling motion.",
    defaultRest: 45
  },
  {
    id: "decline_crunch",
    name: "Decline Crunch",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "curl",
    instructions: "Secure your feet on a decline bench and crunch up by contracting your abs, not pulling with your hip flexors.",
    defaultRest: 60
  },
  {
    id: "russian_twist",
    name: "Russian Twist",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "rotation",
    instructions: "Sit with your torso leaned back and feet off the ground, rotate side to side touching the floor each rep.",
    defaultRest: 45
  },
  {
    id: "pallof_press",
    name: "Pallof Press",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "press",
    instructions: "Stand sideways to a cable, hold the handle at your chest, and press it straight out, resisting the rotation.",
    defaultRest: 60
  },
  {
    id: "dead_bug",
    name: "Dead Bug",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "extension",
    instructions: "Lie on your back with arms and legs raised, slowly extend opposite arm and leg while pressing your low back into the floor.",
    defaultRest: 45
  },
  {
    id: "dragon_flag",
    name: "Dragon Flag",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "raise",
    instructions: "Lie on a bench holding the edge behind your head, raise your body in a straight line, and lower with control.",
    defaultRest: 90
  },

  // ─────────────────────────────────────────────
  // CALVES (~6)
  // ─────────────────────────────────────────────
  {
    id: "standing_calf_raise",
    name: "Standing Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "raise",
    instructions: "Stand on the platform with the balls of your feet, lower your heels for a stretch, then rise onto your toes.",
    defaultRest: 60
  },
  {
    id: "seated_calf_raise",
    name: "Seated Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "raise",
    instructions: "Sit with knees under the pad, lower your heels below the platform, then press up onto your toes.",
    defaultRest: 60
  },
  {
    id: "leg_press_calf_raise",
    name: "Leg Press Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "raise",
    instructions: "Place the balls of your feet on the bottom edge of the leg press platform and perform calf raises.",
    defaultRest: 60
  },
  {
    id: "smith_machine_calf_raise",
    name: "Smith Machine Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "smith_machine",
    category: "isolation",
    movement: "raise",
    instructions: "Stand under the smith bar on a raised platform, lower your heels for a stretch, and press up onto your toes.",
    defaultRest: 60
  },
  {
    id: "donkey_calf_raise",
    name: "Donkey Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "raise",
    instructions: "Bend at the hips on the donkey calf machine, lower your heels below the platform, and press up onto your toes.",
    defaultRest: 60
  },
  {
    id: "single_leg_calf_raise",
    name: "Single Leg Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "raise",
    instructions: "Stand on one foot on an elevated surface, lower your heel for a deep stretch, then press up fully.",
    defaultRest: 60
  },

  // ─────────────────────────────────────────────
  // TRAPS (~5)
  // ─────────────────────────────────────────────
  {
    id: "barbell_shrug",
    name: "Barbell Shrug",
    primaryMuscle: "traps",
    secondaryMuscles: [],
    equipment: "barbell",
    category: "isolation",
    movement: "raise",
    instructions: "Hold the bar at arms length, shrug your shoulders straight up toward your ears, and hold briefly at the top.",
    defaultRest: 75
  },
  {
    id: "dumbbell_shrug",
    name: "Dumbbell Shrug",
    primaryMuscle: "traps",
    secondaryMuscles: [],
    equipment: "dumbbell",
    category: "isolation",
    movement: "raise",
    instructions: "Hold dumbbells at your sides and shrug your shoulders up toward your ears, squeezing your traps at the top.",
    defaultRest: 75
  },
  {
    id: "cable_shrug",
    name: "Cable Shrug",
    primaryMuscle: "traps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "raise",
    instructions: "Stand between low cables or facing a low cable with a bar, shrug your shoulders up with constant tension.",
    defaultRest: 60
  },
  {
    id: "farmers_carry",
    name: "Farmers Carry",
    primaryMuscle: "traps",
    secondaryMuscles: ["forearms", "abs"],
    equipment: "dumbbell",
    category: "compound",
    movement: "carry",
    instructions: "Hold heavy dumbbells at your sides, stand tall, and walk with controlled steps while bracing your core.",
    defaultRest: 120
  },
  {
    id: "smith_machine_shrug",
    name: "Smith Machine Shrug",
    primaryMuscle: "traps",
    secondaryMuscles: [],
    equipment: "smith_machine",
    category: "isolation",
    movement: "raise",
    instructions: "Stand in the smith machine with the bar at arms length and shrug straight up, holding the squeeze.",
    defaultRest: 75
  },

  // ─────────────────────────────────────────────
  // FOREARMS (~5)
  // ─────────────────────────────────────────────
  {
    id: "wrist_curl",
    name: "Wrist Curl",
    primaryMuscle: "forearms",
    secondaryMuscles: [],
    equipment: "barbell",
    category: "isolation",
    movement: "curl",
    instructions: "Rest your forearms on a bench with wrists hanging off, curl the bar up by flexing your wrists.",
    defaultRest: 45
  },
  {
    id: "reverse_wrist_curl",
    name: "Reverse Wrist Curl",
    primaryMuscle: "forearms",
    secondaryMuscles: [],
    equipment: "barbell",
    category: "isolation",
    movement: "curl",
    instructions: "Rest your forearms on a bench palms down with wrists hanging off, and extend your wrists upward.",
    defaultRest: 45
  },
  {
    id: "reverse_barbell_curl",
    name: "Reverse Barbell Curl",
    primaryMuscle: "forearms",
    secondaryMuscles: ["biceps"],
    equipment: "barbell",
    category: "isolation",
    movement: "curl",
    instructions: "Grip the bar with palms facing down and curl it up, focusing on your forearm extensors.",
    defaultRest: 60
  },
  {
    id: "behind_the_back_wrist_curl",
    name: "Behind The Back Wrist Curl",
    primaryMuscle: "forearms",
    secondaryMuscles: [],
    equipment: "barbell",
    category: "isolation",
    movement: "curl",
    instructions: "Hold a barbell behind your back and curl your wrists up, allowing the bar to roll to your fingertips on the way down.",
    defaultRest: 45
  },
  {
    id: "plate_pinch",
    name: "Plate Pinch",
    primaryMuscle: "forearms",
    secondaryMuscles: [],
    equipment: "barbell",
    category: "isolation",
    movement: "carry",
    instructions: "Pinch two weight plates together smooth-side-out and hold for time, squeezing hard with your fingers and thumb.",
    defaultRest: 60
  },

  // ─────────────────────────────────────────────
  // COMPOUND / FULL BODY (~15)
  // ─────────────────────────────────────────────
  {
    id: "conventional_deadlift",
    name: "Conventional Deadlift",
    primaryMuscle: "back",
    secondaryMuscles: ["hamstrings", "glutes", "quads", "traps", "forearms", "abs"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Stand with feet hip-width, grip the bar just outside your legs, brace hard, and stand up by driving through the floor.",
    defaultRest: 180
  },
  {
    id: "trap_bar_deadlift",
    name: "Trap Bar Deadlift",
    primaryMuscle: "quads",
    secondaryMuscles: ["hamstrings", "glutes", "back", "traps", "forearms"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Stand inside the trap bar, grip the handles, brace your core, and stand up by pushing through the floor.",
    defaultRest: 180
  },
  {
    id: "power_clean",
    name: "Power Clean",
    primaryMuscle: "back",
    secondaryMuscles: ["quads", "hamstrings", "glutes", "traps", "front_delts"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Pull the bar from the floor, explosively extend your hips, and catch the bar in a front rack position.",
    defaultRest: 180
  },
  {
    id: "snatch_grip_deadlift",
    name: "Snatch Grip Deadlift",
    primaryMuscle: "back",
    secondaryMuscles: ["hamstrings", "glutes", "traps", "quads"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Use a wide snatch-width grip, keep your chest up, and stand up by driving through the floor.",
    defaultRest: 180
  },
  {
    id: "barbell_thruster",
    name: "Barbell Thruster",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "front_delts", "triceps", "abs"],
    equipment: "barbell",
    category: "compound",
    movement: "squat",
    instructions: "Front squat the bar to depth, then use the momentum of standing to press the bar overhead in one fluid motion.",
    defaultRest: 150
  },
  {
    id: "dumbbell_thruster",
    name: "Dumbbell Thruster",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "front_delts", "triceps", "abs"],
    equipment: "dumbbell",
    category: "compound",
    movement: "squat",
    instructions: "Hold dumbbells at your shoulders, squat, then drive up and press the dumbbells overhead.",
    defaultRest: 120
  },
  {
    id: "clean_and_press",
    name: "Clean and Press",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["back", "quads", "hamstrings", "glutes", "traps", "triceps"],
    equipment: "barbell",
    category: "compound",
    movement: "vertical_push",
    instructions: "Clean the bar to your shoulders, then strict press it overhead to full lockout.",
    defaultRest: 180
  },
  {
    id: "turkish_get_up",
    name: "Turkish Get Up",
    primaryMuscle: "abs",
    secondaryMuscles: ["front_delts", "glutes", "quads", "triceps"],
    equipment: "kettlebell",
    category: "compound",
    movement: "press",
    instructions: "Lie down with a kettlebell pressed overhead, then stand up through a series of controlled positions while keeping the weight stable.",
    defaultRest: 120
  },
  {
    id: "burpee",
    name: "Burpee",
    primaryMuscle: "quads",
    secondaryMuscles: ["chest", "front_delts", "triceps", "abs", "glutes"],
    equipment: "bodyweight",
    category: "compound",
    movement: "squat",
    instructions: "Drop into a push-up, perform the push-up, jump your feet forward, and explosively jump up with arms overhead.",
    defaultRest: 90
  },
  {
    id: "man_maker",
    name: "Man Maker",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["chest", "back", "quads", "glutes", "abs", "triceps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "vertical_push",
    instructions: "Do a push-up on dumbbells, row each side, jump to standing, clean the dumbbells, and press overhead.",
    defaultRest: 150
  },
  {
    id: "suitcase_carry",
    name: "Suitcase Carry",
    primaryMuscle: "abs",
    secondaryMuscles: ["forearms", "traps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "carry",
    instructions: "Hold a heavy dumbbell on one side, stand tall without leaning, and walk with controlled steps.",
    defaultRest: 90
  },
  {
    id: "overhead_carry",
    name: "Overhead Carry",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["abs", "traps", "triceps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "carry",
    instructions: "Press a dumbbell or kettlebell overhead, lock your arm, and walk with stability while bracing your core.",
    defaultRest: 90
  },
  {
    id: "battle_rope_slam",
    name: "Battle Rope Slam",
    primaryMuscle: "abs",
    secondaryMuscles: ["front_delts", "back", "quads"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_push",
    instructions: "Raise both rope ends overhead and slam them down explosively while squatting and bracing your core.",
    defaultRest: 90
  },
  {
    id: "kettlebell_clean_and_press",
    name: "Kettlebell Clean and Press",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["back", "biceps", "glutes", "abs", "triceps"],
    equipment: "kettlebell",
    category: "compound",
    movement: "vertical_push",
    instructions: "Swing the kettlebell up to the rack position in one motion, then press it overhead to lockout.",
    defaultRest: 120
  },
  {
    id: "kettlebell_snatch",
    name: "Kettlebell Snatch",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back", "front_delts", "abs"],
    equipment: "kettlebell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Swing the kettlebell between your legs and explosively punch it overhead in one fluid motion.",
    defaultRest: 120
  },

  // ─────────────────────────────────────────────
  // ADDITIONAL EXERCISES (to reach 200+)
  // ─────────────────────────────────────────────

  // More chest
  {
    id: "svend_press",
    name: "Svend Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts"],
    equipment: "barbell",
    category: "isolation",
    movement: "horizontal_push",
    instructions: "Squeeze two plates together at chest height and press them out in front of you while maintaining the squeeze.",
    defaultRest: 60
  },

  // More back
  {
    id: "wide_grip_lat_pulldown",
    name: "Wide Grip Lat Pulldown",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps"],
    equipment: "cable",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Use a wide overhand grip and pull the bar to your upper chest, driving your elbows down to your sides.",
    defaultRest: 120
  },
  {
    id: "neutral_grip_pull_up",
    name: "Neutral Grip Pull Up",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps", "forearms"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Grip parallel handles with palms facing each other and pull your chest to the bar.",
    defaultRest: 150
  },

  // More quads
  {
    id: "belt_squat",
    name: "Belt Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
    equipment: "machine",
    category: "compound",
    movement: "squat",
    instructions: "Attach the belt around your hips, stand on the platforms, and squat to depth without spinal loading.",
    defaultRest: 150
  },
  {
    id: "pendulum_squat",
    name: "Pendulum Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
    equipment: "machine",
    category: "compound",
    movement: "squat",
    instructions: "Stand on the pendulum squat platform, lean into the shoulder pads, and squat deep with a controlled tempo.",
    defaultRest: 150
  },

  // More hamstrings
  {
    id: "glute_ham_raise",
    name: "Glute Ham Raise",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes"],
    equipment: "machine",
    category: "isolation",
    movement: "curl",
    instructions: "Position yourself in the GHD, lower your torso toward the floor, then curl back up using your hamstrings.",
    defaultRest: 90
  },

  // More glutes
  {
    id: "single_leg_hip_thrust",
    name: "Single Leg Hip Thrust",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "bodyweight",
    category: "isolation",
    movement: "hip_hinge",
    instructions: "Set up like a hip thrust but extend one leg, drive through the planted foot, and squeeze your glute at the top.",
    defaultRest: 75
  },

  // More shoulders
  {
    id: "machine_shoulder_press",
    name: "Machine Shoulder Press",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["lateral_delts", "triceps"],
    equipment: "machine",
    category: "compound",
    movement: "vertical_push",
    instructions: "Sit in the machine, grip the handles at shoulder height, and press overhead to full extension.",
    defaultRest: 120
  },
  {
    id: "smith_machine_shoulder_press",
    name: "Smith Machine Shoulder Press",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["lateral_delts", "triceps"],
    equipment: "smith_machine",
    category: "compound",
    movement: "vertical_push",
    instructions: "Sit under the smith bar, position it at chin height, and press up to lockout.",
    defaultRest: 120
  },
  {
    id: "behind_the_neck_press",
    name: "Behind The Neck Press",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["lateral_delts", "triceps"],
    equipment: "barbell",
    category: "compound",
    movement: "vertical_push",
    instructions: "With the bar behind your neck on your traps, press straight up to lockout with a controlled tempo.",
    defaultRest: 120
  },
  {
    id: "lu_raise",
    name: "Lu Raise",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["lateral_delts"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "raise",
    instructions: "Raise dumbbells out to the sides to 90 degrees, then rotate them overhead in a continuous arc.",
    defaultRest: 60
  },
  {
    id: "band_face_pull",
    name: "Band Face Pull",
    primaryMuscle: "rear_delts",
    secondaryMuscles: ["traps", "back"],
    equipment: "bands",
    category: "isolation",
    movement: "horizontal_pull",
    instructions: "Anchor a band at face height, grip it with both hands, and pull toward your face with external rotation.",
    defaultRest: 45
  },
  {
    id: "prone_y_raise",
    name: "Prone Y Raise",
    primaryMuscle: "rear_delts",
    secondaryMuscles: ["traps"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "raise",
    instructions: "Lie face down on an incline bench and raise light dumbbells in a Y pattern overhead.",
    defaultRest: 45
  },

  // More biceps
  {
    id: "cross_body_hammer_curl",
    name: "Cross Body Hammer Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Curl the dumbbell across your body toward the opposite shoulder with a neutral grip.",
    defaultRest: 60
  },
  {
    id: "band_curl",
    name: "Band Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    equipment: "bands",
    category: "isolation",
    movement: "curl",
    instructions: "Stand on a band, grip the ends, and curl up with increasing resistance at the top.",
    defaultRest: 45
  },

  // More triceps
  {
    id: "overhead_cable_extension_single_arm",
    name: "Overhead Cable Extension (Single Arm)",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "extension",
    instructions: "Face away from a low cable, hold a single handle overhead, and extend your arm from behind your head.",
    defaultRest: 60
  },
  {
    id: "ez_bar_skull_crusher",
    name: "EZ Bar Skull Crusher",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "ez_bar",
    category: "isolation",
    movement: "extension",
    instructions: "Lie on a bench with the EZ bar, lower it behind your head for a deeper stretch, then extend back up.",
    defaultRest: 75
  },

  // More abs
  {
    id: "leg_raise",
    name: "Leg Raise",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "raise",
    instructions: "Lie flat on your back, keep your legs straight, and raise them to 90 degrees, then lower with control.",
    defaultRest: 45
  },
  {
    id: "v_up",
    name: "V-Up",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "curl",
    instructions: "Lie flat, simultaneously raise your arms and legs to meet in the middle forming a V, then lower back down.",
    defaultRest: 45
  },
  {
    id: "mountain_climber",
    name: "Mountain Climber",
    primaryMuscle: "abs",
    secondaryMuscles: ["quads", "front_delts"],
    equipment: "bodyweight",
    category: "compound",
    movement: "press",
    instructions: "In a push-up position, rapidly alternate driving each knee toward your chest while keeping your hips level.",
    defaultRest: 45
  },
  {
    id: "side_plank",
    name: "Side Plank",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "bodyweight",
    category: "isolation",
    movement: "press",
    instructions: "Lie on your side propped on your forearm, raise your hips to form a straight line, and hold.",
    defaultRest: 45
  },
  {
    id: "cable_woodchop",
    name: "Cable Woodchop",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "rotation",
    instructions: "Set a cable high, grip with both hands, and chop diagonally across your body by rotating your torso.",
    defaultRest: 60
  },

  // More forearms
  {
    id: "dumbbell_wrist_curl",
    name: "Dumbbell Wrist Curl",
    primaryMuscle: "forearms",
    secondaryMuscles: [],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Rest your forearm on a bench with your wrist hanging off and curl the dumbbell up by flexing your wrist.",
    defaultRest: 45
  },
  {
    id: "zottman_curl",
    name: "Zottman Curl",
    primaryMuscle: "forearms",
    secondaryMuscles: ["biceps"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Curl dumbbells up with palms facing up, rotate to palms down at the top, and lower in a reverse curl motion.",
    defaultRest: 60
  },

  // More traps
  {
    id: "face_pull_high",
    name: "Face Pull (High)",
    primaryMuscle: "traps",
    secondaryMuscles: ["rear_delts"],
    equipment: "cable",
    category: "isolation",
    movement: "horizontal_pull",
    instructions: "Set the cable above head height, pull the rope to your face with elbows high, and squeeze your upper traps.",
    defaultRest: 60
  },

  // More calves
  {
    id: "barbell_calf_raise",
    name: "Barbell Calf Raise",
    primaryMuscle: "calves",
    secondaryMuscles: [],
    equipment: "barbell",
    category: "isolation",
    movement: "raise",
    instructions: "With a barbell on your back, stand on a raised surface and perform full range calf raises.",
    defaultRest: 75
  },

  // Additional exercises to ensure 200+
  {
    id: "incline_cable_fly",
    name: "Incline Cable Fly",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts"],
    equipment: "cable",
    category: "isolation",
    movement: "fly",
    instructions: "Set an incline bench between low cables, bring the handles together above your chest in a hugging motion.",
    defaultRest: 60
  },
  {
    id: "dumbbell_squeeze_press",
    name: "Dumbbell Squeeze Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Press two dumbbells together while bench pressing, keeping constant inward pressure throughout the movement.",
    defaultRest: 90
  },
  {
    id: "cable_bicep_curl_21s",
    name: "Cable Bicep Curl 21s",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "cable",
    category: "isolation",
    movement: "curl",
    instructions: "Perform 7 reps in the bottom half, 7 in the top half, and 7 full range for a total of 21 reps.",
    defaultRest: 90
  },
  {
    id: "lat_prayer",
    name: "Lat Prayer",
    primaryMuscle: "lats",
    secondaryMuscles: ["abs"],
    equipment: "cable",
    category: "isolation",
    movement: "vertical_pull",
    instructions: "Kneel before a cable with a rope at face height, pull down in a praying motion, flexing your lats hard.",
    defaultRest: 60
  },
  {
    id: "deficit_push_up",
    name: "Deficit Push Up",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "bodyweight",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Place your hands on raised surfaces to increase range of motion, lower deeper than a standard push-up.",
    defaultRest: 90
  },
  {
    id: "pike_push_up",
    name: "Pike Push Up",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["triceps"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_push",
    instructions: "Form an inverted V with your hips high, bend your elbows to lower your head toward the ground, then press up.",
    defaultRest: 90
  },
  {
    id: "handstand_push_up",
    name: "Handstand Push Up",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["triceps", "traps"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_push",
    instructions: "Kick up into a handstand against a wall, lower until your head touches the floor, then press back up.",
    defaultRest: 150
  },
  {
    id: "muscle_up",
    name: "Muscle Up",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps", "triceps", "chest"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Explosively pull yourself above the bar and transition into a dip to press above it.",
    defaultRest: 180
  },
  {
    id: "kettlebell_goblet_squat",
    name: "Kettlebell Goblet Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "abs"],
    equipment: "kettlebell",
    category: "compound",
    movement: "squat",
    instructions: "Hold a kettlebell at chest height by the horns, sit deep between your knees, and stand back up.",
    defaultRest: 120
  },
  {
    id: "banded_lateral_walk",
    name: "Banded Lateral Walk",
    primaryMuscle: "glutes",
    secondaryMuscles: [],
    equipment: "bands",
    category: "isolation",
    movement: "raise",
    instructions: "Place a band above your knees, get into a quarter squat, and take controlled steps to each side.",
    defaultRest: 45
  },
  {
    id: "hip_adduction_machine",
    name: "Hip Adduction Machine",
    primaryMuscle: "quads",
    secondaryMuscles: [],
    equipment: "machine",
    category: "isolation",
    movement: "raise",
    instructions: "Sit in the machine with pads on the inside of your knees and squeeze your legs together.",
    defaultRest: 60
  },
  {
    id: "cable_lateral_lunge",
    name: "Cable Lateral Lunge",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "cable",
    category: "compound",
    movement: "lunge",
    instructions: "Stand sideways to a cable, step out into a lateral lunge, then drive back to the starting position.",
    defaultRest: 90
  },
  {
    id: "barbell_hip_thrust_banded",
    name: "Banded Barbell Hip Thrust",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "bands",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Set up a hip thrust with a barbell and a band around your knees, thrust up while pushing out against the band.",
    defaultRest: 120
  },
  {
    id: "ez_bar_spider_curl",
    name: "EZ Bar Spider Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "ez_bar",
    category: "isolation",
    movement: "curl",
    instructions: "Lean over the vertical side of a preacher bench and curl the EZ bar up with no momentum.",
    defaultRest: 60
  },
  {
    id: "lying_dumbbell_tricep_extension",
    name: "Lying Dumbbell Tricep Extension",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "dumbbell",
    category: "isolation",
    movement: "extension",
    instructions: "Lie on a bench with dumbbells above you, lower them beside your head by bending your elbows, then extend.",
    defaultRest: 75
  },
  {
    id: "toes_to_bar",
    name: "Toes To Bar",
    primaryMuscle: "abs",
    secondaryMuscles: ["lats"],
    equipment: "bodyweight",
    category: "isolation",
    movement: "raise",
    instructions: "Hang from a bar and raise your feet all the way to touch the bar, engaging your entire core.",
    defaultRest: 75
  },
  {
    id: "kettlebell_windmill",
    name: "Kettlebell Windmill",
    primaryMuscle: "abs",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "kettlebell",
    category: "compound",
    movement: "rotation",
    instructions: "Press a kettlebell overhead, push your hip out to the side, and lower your torso toward the floor while keeping the weight overhead.",
    defaultRest: 90
  },
  {
    id: "barbell_hack_squat",
    name: "Barbell Hack Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
    equipment: "barbell",
    category: "compound",
    movement: "squat",
    instructions: "Hold a barbell behind your legs, squat down, and stand up by driving through your heels.",
    defaultRest: 150
  },
  {
    id: "dumbbell_lateral_raise_lean_away",
    name: "Lean Away Lateral Raise",
    primaryMuscle: "lateral_delts",
    secondaryMuscles: [],
    equipment: "dumbbell",
    category: "isolation",
    movement: "raise",
    instructions: "Hold a pole for support, lean away, and raise a dumbbell to the side for a greater range of motion.",
    defaultRest: 60
  },
  {
    id: "cable_upright_row",
    name: "Cable Upright Row",
    primaryMuscle: "lateral_delts",
    secondaryMuscles: ["front_delts", "traps"],
    equipment: "cable",
    category: "compound",
    movement: "raise",
    instructions: "Use a straight bar on a low cable and pull it up along your body to chin height, leading with your elbows.",
    defaultRest: 75
  },
  {
    id: "resistance_band_pull_up",
    name: "Resistance Band Pull Up",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps"],
    equipment: "bands",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Loop a band over the bar and place your foot in it, then perform pull-ups with the band assisting you.",
    defaultRest: 120
  },
  {
    id: "smith_machine_incline_bench",
    name: "Smith Machine Incline Bench Press",
    primaryMuscle: "chest",
    secondaryMuscles: ["front_delts", "triceps"],
    equipment: "smith_machine",
    category: "compound",
    movement: "horizontal_push",
    instructions: "Set an incline bench in the smith machine, lower the bar to your upper chest, and press to lockout.",
    defaultRest: 120
  },
  {
    id: "single_arm_dumbbell_row",
    name: "Single Arm Dumbbell Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps"],
    equipment: "dumbbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Place one knee and hand on a bench, row the dumbbell to your hip with your back flat.",
    defaultRest: 90
  },
  {
    id: "reverse_grip_barbell_row",
    name: "Reverse Grip Barbell Row",
    primaryMuscle: "back",
    secondaryMuscles: ["lats", "biceps"],
    equipment: "barbell",
    category: "compound",
    movement: "horizontal_pull",
    instructions: "Grip the bar underhand, hinge forward, and row to your lower chest for extra bicep and lower lat recruitment.",
    defaultRest: 120
  },
  {
    id: "safety_bar_squat",
    name: "Safety Bar Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings", "abs"],
    equipment: "barbell",
    category: "compound",
    movement: "squat",
    instructions: "Use a safety squat bar on your back, grip the handles, squat to depth while fighting the forward lean.",
    defaultRest: 180
  },
  {
    id: "jefferson_curl",
    name: "Jefferson Curl",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["back"],
    equipment: "barbell",
    category: "isolation",
    movement: "hip_hinge",
    instructions: "Stand on an elevated surface, slowly round your spine one vertebra at a time while lowering the weight past your feet.",
    defaultRest: 75
  },
  {
    id: "dumbbell_front_raise_plate",
    name: "Plate Front Raise",
    primaryMuscle: "front_delts",
    secondaryMuscles: ["abs"],
    equipment: "barbell",
    category: "isolation",
    movement: "raise",
    instructions: "Hold a weight plate at 3 and 9 o'clock, raise it from waist to overhead, and lower with control.",
    defaultRest: 60
  },
  {
    id: "lying_cable_curl",
    name: "Lying Cable Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "curl",
    instructions: "Lie on the floor facing a low cable, arms extended toward it, and curl the bar toward your forehead.",
    defaultRest: 60
  },
  {
    id: "cable_kickback_tricep",
    name: "Cable Tricep Kickback",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "extension",
    instructions: "Hinge forward, pin your elbow at your side, and extend the cable handle behind you until your arm is straight.",
    defaultRest: 60
  },
  {
    id: "deficit_deadlift",
    name: "Deficit Deadlift",
    primaryMuscle: "back",
    secondaryMuscles: ["hamstrings", "glutes", "quads"],
    equipment: "barbell",
    category: "compound",
    movement: "hip_hinge",
    instructions: "Stand on a 2-4 inch platform, grip the bar, and deadlift with an extended range of motion.",
    defaultRest: 180
  },
  {
    id: "pause_squat",
    name: "Pause Squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings", "abs"],
    equipment: "barbell",
    category: "compound",
    movement: "squat",
    instructions: "Squat to depth, pause for 2-3 seconds in the hole without relaxing, then drive back up explosively.",
    defaultRest: 180
  },
  {
    id: "close_grip_pull_up",
    name: "Close Grip Pull Up",
    primaryMuscle: "lats",
    secondaryMuscles: ["back", "biceps"],
    equipment: "bodyweight",
    category: "compound",
    movement: "vertical_pull",
    instructions: "Grip the bar with hands close together, pull your chest up to the bar, and lower with control.",
    defaultRest: 150
  },
  {
    id: "dumbbell_lateral_lunge",
    name: "Dumbbell Lateral Lunge",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "dumbbell",
    category: "compound",
    movement: "lunge",
    instructions: "Hold dumbbells at your sides, step out laterally into a deep lunge, then push back to standing.",
    defaultRest: 90
  },
  {
    id: "cable_crunch_standing",
    name: "Standing Cable Crunch",
    primaryMuscle: "abs",
    secondaryMuscles: [],
    equipment: "cable",
    category: "isolation",
    movement: "curl",
    instructions: "Stand facing a high cable, hold the rope behind your head, and crunch down by contracting your abs.",
    defaultRest: 60
  },
  {
    id: "incline_hammer_curl",
    name: "Incline Hammer Curl",
    primaryMuscle: "biceps",
    secondaryMuscles: ["forearms"],
    equipment: "dumbbell",
    category: "isolation",
    movement: "curl",
    instructions: "Sit on an incline bench with arms hanging, curl the dumbbells with a neutral grip keeping upper arms stationary.",
    defaultRest: 60
  }
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

let _exerciseMap = null;

export function getExerciseById(id) {
  if (!_exerciseMap) {
    _exerciseMap = new Map();
    EXERCISES.forEach(e => _exerciseMap.set(e.id, e));
  }
  return _exerciseMap.get(id) || null;
}

export function filterExercises({ muscle, equipment, category, search } = {}) {
  return EXERCISES.filter(e => {
    if (muscle && e.primaryMuscle !== muscle && !e.secondaryMuscles.includes(muscle)) return false;
    if (equipment && e.equipment !== equipment) return false;
    if (category && e.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function getExercisesForMuscle(muscle) {
  return EXERCISES.filter(e => e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle));
}
