import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const nutrients = v.object({
  kcal: v.number(),
  protein: v.number(),
  carbs: v.number(),
  fat: v.number(),
  fiber: v.number(),
});

export const measurementFields = v.object({
  waist: v.optional(v.number()),
  chest: v.optional(v.number()),
  arms: v.optional(v.number()),
  shoulders: v.optional(v.number()),
  thighs: v.optional(v.number()),
  hips: v.optional(v.number()),
  neck: v.optional(v.number()),
  calves: v.optional(v.number()),
});

/** What a family member lets the rest of the circle see. Photos are never shareable. */
export const shareFields = v.object({
  meals: v.boolean(),
  water: v.boolean(),
  workouts: v.boolean(),
  sleep: v.boolean(),
  body: v.boolean(),
});

export default defineSchema({
  ...authTables,

  /** One row per user. Everything personalization-related lives here. */
  profiles: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    sex: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    birthYear: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    startWeightKg: v.optional(v.number()),
    targetWeightKg: v.optional(v.number()),
    goal: v.optional(v.string()), // fat_loss | muscle_gain | recomp | strength | endurance | general
    experience: v.optional(v.string()), // beginner | intermediate | advanced
    activityLevel: v.optional(v.string()), // sedentary | light | moderate | active | very_active
    daysPerWeek: v.optional(v.number()),
    preferredDays: v.optional(v.array(v.number())), // 0=Sun
    sessionMinutes: v.optional(v.number()),
    equipment: v.optional(v.array(v.string())),
    dietPreference: v.optional(v.string()), // veg | nonveg | egg | vegan
    allergies: v.optional(v.array(v.string())),
    mealSchedule: v.optional(v.array(v.string())),
    bedtime: v.optional(v.string()), // "23:00"
    wakeTime: v.optional(v.string()),
    units: v.optional(v.string()), // metric | imperial
    theme: v.optional(v.string()),
    timezone: v.optional(v.string()), // IANA; "today" is computed in this zone
    onboardingComplete: v.boolean(),
    onboardingStep: v.optional(v.number()),
    hasSampleData: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  /** Daily targets. Never mutated in place — a change writes a new row so history stays honest. */
  targets: defineTable({
    userId: v.id("users"),
    effectiveFrom: v.string(), // YYYY-MM-DD
    kcal: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.number(),
    waterMl: v.number(),
    sleepMinutes: v.number(),
    steps: v.optional(v.number()),
    source: v.string(), // estimated | custom
    basis: v.optional(v.object({ bmr: v.number(), tdee: v.number(), method: v.string() })),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "effectiveFrom"]),

  goals: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    metric: v.string(), // weight | bodyfat | strength | consistency | custom
    startValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    status: v.string(), // active | achieved | archived
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  exercises: defineTable({
    ownerUserId: v.optional(v.id("users")), // undefined = shared library
    name: v.string(),
    searchName: v.string(),
    primaryMuscles: v.array(v.string()),
    secondaryMuscles: v.array(v.string()),
    equipment: v.array(v.string()),
    category: v.string(), // strength | cardio | mobility | core
    pattern: v.string(), // push | pull | squat | hinge | carry | core | conditioning | isolation
    difficulty: v.string(),
    unilateral: v.optional(v.boolean()),
    instructions: v.array(v.string()),
    isSample: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
  })
    .index("by_owner", ["ownerUserId"])
    .searchIndex("search_name", { searchField: "searchName", filterFields: ["ownerUserId", "category"] }),

  programs: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    goal: v.optional(v.string()),
    daysPerWeek: v.number(),
    isActive: v.boolean(),
    source: v.string(), // generated | custom | template
    isSample: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  programDays: defineTable({
    userId: v.id("users"),
    programId: v.id("programs"),
    order: v.number(),
    weekday: v.optional(v.number()),
    title: v.string(),
    focus: v.string(),
    estMinutes: v.number(),
    items: v.array(
      v.object({
        exerciseId: v.id("exercises"),
        sets: v.number(),
        reps: v.string(), // "8-12" or "30s"
        targetWeightKg: v.optional(v.number()),
        restSec: v.number(),
        tempo: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  })
    .index("by_program", ["programId"])
    .index("by_user", ["userId"]),

  workouts: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    programId: v.optional(v.id("programs")),
    programDayId: v.optional(v.id("programDays")),
    title: v.string(),
    focus: v.string(),
    status: v.string(), // planned | in_progress | completed | skipped
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    durationMin: v.optional(v.number()),
    rpe: v.optional(v.number()),
    notes: v.optional(v.string()),
    totalVolumeKg: v.optional(v.number()),
    isSample: v.optional(v.boolean()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_status", ["userId", "status"]),

  workoutExercises: defineTable({
    userId: v.id("users"),
    workoutId: v.id("workouts"),
    exerciseId: v.id("exercises"),
    order: v.number(),
    restSec: v.number(),
    tempo: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_workout", ["workoutId"])
    .index("by_user_exercise", ["userId", "exerciseId"]),

  sets: defineTable({
    userId: v.id("users"),
    workoutId: v.id("workouts"),
    workoutExerciseId: v.id("workoutExercises"),
    exerciseId: v.id("exercises"),
    index: v.number(),
    kind: v.string(), // warmup | working
    targetReps: v.optional(v.string()),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    seconds: v.optional(v.number()),
    completed: v.boolean(),
    rpe: v.optional(v.number()),
    date: v.string(),
  })
    .index("by_workout_exercise", ["workoutExerciseId"])
    .index("by_workout", ["workoutId"])
    .index("by_user_exercise", ["userId", "exerciseId"]),

  personalRecords: defineTable({
    userId: v.id("users"),
    exerciseId: v.id("exercises"),
    kind: v.string(), // e1rm | weight | volume
    value: v.number(),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    date: v.string(),
    workoutId: v.optional(v.id("workouts")),
  })
    .index("by_user", ["userId"])
    .index("by_user_exercise", ["userId", "exerciseId"]),

  foods: defineTable({
    ownerUserId: v.optional(v.id("users")),
    name: v.string(),
    searchName: v.string(),
    category: v.string(),
    region: v.optional(v.string()),
    veg: v.boolean(),
    state: v.string(), // cooked | raw | as_is
    per100: nutrients,
    servings: v.array(v.object({ label: v.string(), grams: v.number() })),
    defaultServing: v.number(),
    tags: v.optional(v.array(v.string())),
    source: v.string(), // library | custom | recipe
    verified: v.boolean(),
    archived: v.optional(v.boolean()),
  })
    .index("by_owner", ["ownerUserId"])
    .searchIndex("search_name", { searchField: "searchName", filterFields: ["ownerUserId", "category", "veg"] }),

  recipes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    servings: v.number(),
    items: v.array(v.object({ foodId: v.id("foods"), grams: v.number() })),
    notes: v.optional(v.string()),
    per100: nutrients, // computed at save time
    gramsTotal: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  mealTemplates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    meal: v.optional(v.string()),
    items: v.array(
      v.object({ foodId: v.id("foods"), grams: v.number(), unitLabel: v.string(), qty: v.number() })
    ),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  /** Nutrition entries snapshot their nutrients so editing a food later never rewrites history. */
  mealEntries: defineTable({
    userId: v.id("users"),
    date: v.string(),
    meal: v.string(), // breakfast | lunch | dinner | snack
    foodId: v.optional(v.id("foods")),
    recipeId: v.optional(v.id("recipes")),
    name: v.string(),
    qty: v.number(),
    unitLabel: v.string(),
    grams: v.number(),
    nutrients,
    estimated: v.boolean(),
    at: v.number(),
    isSample: v.optional(v.boolean()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_food", ["userId", "foodId"]),

  waterLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    ml: v.number(),
    at: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  sleepSessions: defineTable({
    userId: v.id("users"),
    date: v.string(), // date of waking
    bedAt: v.number(),
    wakeAt: v.number(),
    minutes: v.number(),
    quality: v.optional(v.number()), // 1..5
    notes: v.optional(v.string()),
    source: v.string(), // manual | imported
    isSample: v.optional(v.boolean()),
  }).index("by_user_date", ["userId", "date"]),

  bodyMetrics: defineTable({
    userId: v.id("users"),
    date: v.string(),
    weightKg: v.optional(v.number()),
    bodyFatPct: v.optional(v.number()),
    measurements: v.optional(measurementFields),
    notes: v.optional(v.string()),
    isSample: v.optional(v.boolean()),
  }).index("by_user_date", ["userId", "date"]),

  progressPhotos: defineTable({
    userId: v.id("users"),
    date: v.string(),
    pose: v.string(), // front | side | back
    storageId: v.id("_storage"),
    weightKg: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_storage", ["storageId"]),

  checkins: defineTable({
    userId: v.id("users"),
    date: v.string(),
    energy: v.number(),
    soreness: v.number(),
    stress: v.number(),
    notes: v.optional(v.string()),
    isSample: v.optional(v.boolean()),
  }).index("by_user_date", ["userId", "date"]),

  reminders: defineTable({
    userId: v.id("users"),
    kind: v.string(), // workout | meal | water | sleep | weigh_in | photo
    label: v.string(),
    time: v.string(),
    days: v.array(v.number()),
    enabled: v.boolean(),
  }).index("by_user", ["userId"]),

  seedMeta: defineTable({ key: v.string(), version: v.number(), count: v.number() }).index("by_key", ["key"]),

  /* ------------------------------- Family ------------------------------- */

  /** A family group. A user belongs to at most one circle. */
  circles: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }),

  /** Membership + that member's own privacy choices. Every family read is gated on this row. */
  circleMembers: defineTable({
    circleId: v.id("circles"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    status: v.union(v.literal("pending"), v.literal("active")),
    shares: shareFields,
    paused: v.boolean(),
    mutedUserIds: v.array(v.id("users")),
    timezone: v.string(), // IANA, so "today" and quiet hours are the member's own
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_circle", ["circleId"]),

  /** Code alone → owner approves. Code + password → instant join. */
  circleInvites: defineTable({
    circleId: v.id("circles"),
    code: v.string(),
    createdBy: v.id("users"),
    passwordHash: v.optional(v.string()), // "salt:hash", PBKDF2-SHA256
    expiresAt: v.number(),
    maxUses: v.number(),
    uses: v.number(),
    failedAttempts: v.number(),
    revoked: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_circle", ["circleId"])
    .index("by_creator", ["createdBy"])
    .index("by_expires", ["expiresAt"]),

  nudges: defineTable({
    circleId: v.id("circles"),
    fromId: v.id("users"),
    toId: v.id("users"),
    kind: v.string(), // water | eat | protein | move | workout | sleep | cheer
    message: v.optional(v.string()),
    createdAt: v.number(),
    seenAt: v.optional(v.number()),
  })
    .index("by_to", ["toId", "createdAt"])
    .index("by_from_to", ["fromId", "toId", "createdAt"])
    .index("by_circle", ["circleId"])
    .index("by_created", ["createdAt"]),

  /** Per-user fixed-window counters behind `throttle()` in lib/functions. */
  rateLimits: defineTable({
    key: v.string(), // `${userId}:${bucket}`
    windowStart: v.number(),
    count: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_window", ["windowStart"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
