import { StepCategory, DayOfWeek, TimeOfDay, ScheduleType } from '../types';

// ─── Category Display Info ──────────────────────────────────────────────────
// Muted, earthy tones to match the organic aesthetic

export const CATEGORY_INFO: Record<
  StepCategory,
  { label: string; icon: string; color: string }
> = {
  cleanser: { label: 'Cleanser', icon: 'water', color: '#7B9AAF' },
  toner: { label: 'Toner', icon: 'flask', color: '#9B8BB4' },
  serum: { label: 'Serum', icon: 'eyedrop', color: '#C4A87C' },
  moisturizer: { label: 'Moisturizer', icon: 'water-outline', color: '#7BAFA0' },
  sunscreen: { label: 'Sunscreen', icon: 'sunny', color: '#D4B85A' },
  exfoliant: { label: 'Exfoliant', icon: 'sparkles', color: '#C49A7B' },
  mask: { label: 'Mask', icon: 'happy', color: '#8B9A6B' },
  eye_cream: { label: 'Eye Cream', icon: 'eye', color: '#8B7BAF' },
  lip_care: { label: 'Lip Care', icon: 'heart', color: '#C48B8B' },
  treatment: { label: 'Treatment', icon: 'medkit', color: '#AF7B7B' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: '#9A9A8B' },
};

export const CATEGORIES: StepCategory[] = Object.keys(CATEGORY_INFO) as StepCategory[];

// ─── Days ───────────────────────────────────────────────────────────────────

export const DAYS_OF_WEEK: { key: DayOfWeek; short: string; label: string }[] = [
  { key: 'monday', short: 'M', label: 'Monday' },
  { key: 'tuesday', short: 'T', label: 'Tuesday' },
  { key: 'wednesday', short: 'W', label: 'Wednesday' },
  { key: 'thursday', short: 'T', label: 'Thursday' },
  { key: 'friday', short: 'F', label: 'Friday' },
  { key: 'saturday', short: 'S', label: 'Saturday' },
  { key: 'sunday', short: 'S', label: 'Sunday' },
];

export const ALL_DAYS: DayOfWeek[] = DAYS_OF_WEEK.map((d) => d.key);

// ─── Time of Day ────────────────────────────────────────────────────────────

export const TIME_OF_DAY_OPTIONS: { key: TimeOfDay; label: string; icon: string }[] = [
  { key: 'morning', label: 'Morning', icon: 'sunny-outline' },
  { key: 'evening', label: 'Evening', icon: 'moon-outline' },
];

// ─── Time of Day (Product Usage) ────────────────────────────────────────────

export const TIME_OF_DAY_USAGE_OPTIONS: { key: import('../types').TimeOfDayUsage; label: string; icon: string }[] = [
  { key: 'morning', label: 'AM Only', icon: 'sunny-outline' },
  { key: 'evening', label: 'PM Only', icon: 'moon-outline' },
  { key: 'both', label: 'AM & PM', icon: 'time-outline' },
];

// ─── Schedule Type Options ──────────────────────────────────────────────────

export const SCHEDULE_TYPE_OPTIONS: { key: ScheduleType; label: string; icon: string; description: string }[] = [
  { key: 'weekly', label: 'Weekly', icon: 'calendar-outline', description: 'Specific days of the week' },
  { key: 'cycle', label: 'Cycle', icon: 'repeat-outline', description: 'Repeating day rota' },
  { key: 'interval', label: 'Interval', icon: 'timer-outline', description: 'Every X days' },
];

// ─── Frequency Options ──────────────────────────────────────────────────────

export const FREQUENCY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1x / week' },
  { value: 2, label: '2x / week' },
  { value: 3, label: '3x / week' },
  { value: 4, label: '4x / week' },
  { value: 5, label: '5x / week' },
  { value: 6, label: '6x / week' },
  { value: 7, label: 'Daily' },
];

// ─── Default Routine Template ───────────────────────────────────────────────

export const DEFAULT_ROUTINE_TEMPLATE: Partial<
  Pick<import('../types').RoutineStep, 'name' | 'category' | 'time_of_day' | 'days' | 'schedule_type'>
>[] = [
  { name: 'Gentle Cleanser', category: 'cleanser', time_of_day: 'morning', schedule_type: 'weekly', days: ALL_DAYS },
  { name: 'Toner', category: 'toner', time_of_day: 'morning', schedule_type: 'weekly', days: ALL_DAYS },
  { name: 'Vitamin C Serum', category: 'serum', time_of_day: 'morning', schedule_type: 'weekly', days: ALL_DAYS },
  { name: 'Moisturizer', category: 'moisturizer', time_of_day: 'morning', schedule_type: 'weekly', days: ALL_DAYS },
  { name: 'Sunscreen SPF 50', category: 'sunscreen', time_of_day: 'morning', schedule_type: 'weekly', days: ALL_DAYS },
  { name: 'Oil Cleanser', category: 'cleanser', time_of_day: 'evening', schedule_type: 'weekly', days: ALL_DAYS },
  { name: 'Water Cleanser', category: 'cleanser', time_of_day: 'evening', schedule_type: 'weekly', days: ALL_DAYS },
  { name: 'Retinol', category: 'treatment', time_of_day: 'evening', schedule_type: 'weekly', days: ['monday', 'wednesday', 'friday'] },
  { name: 'Night Moisturizer', category: 'moisturizer', time_of_day: 'evening', schedule_type: 'weekly', days: ALL_DAYS },
];

// ─── Active Ingredients List ──────────────────────────────────────────────────

export type IngredientSection = {
  title: string;
  data: string[];
};

export const INGREDIENT_SECTIONS: IngredientSection[] = [
  {
    title: 'Acids',
    data: [
      'Azelaic Acid',
      'Ferulic Acid',
      'Glycolic Acid (AHA)',
      'Hyaluronic Acid',
      'Kojic Acid',
      'Lactic Acid (AHA)',
      'Mandelic Acid (AHA)',
      'Salicylic Acid (BHA)',
      'Tranexamic Acid',
    ],
  },
  {
    title: 'Brightening & Pigmentation',
    data: [
      'Arbutin',
      'Licorice Root Extract',
    ],
  },
  {
    title: 'Ceramides & Barrier Repair',
    data: [
      'Ceramide AP',
      'Ceramide NP',
      'Ceramides',
      'Cholesterol',
      'Fatty Acids',
      'Squalane',
      'Squalene',
    ],
  },
  {
    title: 'Exfoliants',
    data: [
      'Gluconolactone',
      'Lactobionic Acid',
      'PHA (Polyhydroxy Acids)',
    ],
  },
  {
    title: 'Moisturising & Hydrating',
    data: [
      'Glycerin',
      'Sodium Hyaluronate',
      'Urea',
    ],
  },
  {
    title: 'Peptides & Growth Factors',
    data: [
      'Argireline',
      'Copper Peptides',
      'Matrixyl',
      'Palmitoyl Tetrapeptide-7',
      'Palmitoyl Tripeptide-1',
      'Peptides',
    ],
  },
  {
    title: 'Soothing & Anti-inflammatory',
    data: [
      'Allantoin',
      'Aloe Vera',
      'Centella Asiatica',
      'Chamomile Extract',
      'Green Tea Extract',
      'Madecassoside',
      'Zinc PCA',
    ],
  },
  {
    title: 'Sun Protection',
    data: [
      'Avobenzone',
      'Octinoxate',
      'Octocrylene',
      'Titanium Dioxide',
      'Zinc Oxide',
    ],
  },
  {
    title: 'Vitamins & Antioxidants',
    data: [
      'L-Ascorbic Acid',
      'Niacin',
      'Niacinamide',
      'Panthenol (Vitamin B5)',
      'Retinaldehyde',
      'Retinoids',
      'Retinyl Palmitate',
      'Vitamin A (Retinol)',
      'Vitamin C',
      'Vitamin C (Ascorbic Acid)',
      'Vitamin E (Tocopherol)',
    ],
  },
  {
    title: 'Other Actives',
    data: [
      'Adenosine',
      'Bakuchiol',
      'Coenzyme Q10',
      'Collagen',
      'Elastin',
      'Honey',
      'Propolis',
      'Resveratrol',
      'Snail Mucin',
    ],
  },
];

// Flat list for backwards compatibility (e.g. conflict detection)
export const ACTIVE_INGREDIENTS: string[] = INGREDIENT_SECTIONS.flatMap((s) => s.data);
