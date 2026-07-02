export type DistanceUnit = "yds" | "m";
export type SpeedUnit = "mph" | "kph" | "m/s";

export type ClubCategory =
  | "Driver"
  | "Wood"
  | "Hybrid"
  | "Iron"
  | "Wedge"
  | "Putter"
  | "Other";

export interface GolfSession {
  id: string;
  played_on: string; // YYYY-MM-DD
  title: string | null;
  location: string | null;
  source_filename: string | null;
  distance_unit: DistanceUnit;
  speed_unit: SpeedUnit;
  notes: string | null;
  created_at: string;
}

/** Canonical per-shot metrics. All numeric fields are nullable because a given
 *  Garmin export (or device tier) may not include every column. */
export interface Shot {
  id: string;
  session_id: string;
  shot_index: number | null;
  shot_time: string | null;
  club: string | null;
  club_category: ClubCategory | null;
  ball_speed: number | null;
  club_speed: number | null;
  smash_factor: number | null;
  launch_angle: number | null;
  launch_direction: number | null;
  spin_rate: number | null;
  spin_axis: number | null;
  backspin: number | null;
  sidespin: number | null;
  apex_height: number | null;
  carry_distance: number | null;
  total_distance: number | null;
  carry_deviation_angle: number | null;
  carry_deviation_distance: number | null; // + = right, - = left
  total_deviation_angle: number | null;
  total_deviation_distance: number | null;
  attack_angle: number | null;
  club_path: number | null;
  club_face: number | null; // face angle
  face_to_path: number | null;
  note: string | null;
  raw: Record<string, string> | null;
  created_at: string;
}

/** A parsed shot before it is linked to a session / written to the DB. */
export type ParsedShot = Omit<Shot, "id" | "session_id" | "created_at">;

export interface GolfRound {
  id: string;
  played_on: string;
  course: string | null;
  score: number | null;
  par: number | null;
  holes: number | null;
  putts: number | null;
  fairways_hit: number | null;
  greens_in_regulation: number | null;
  notes: string | null;
  created_at: string;
}

/** Numeric column keys on Shot · used generically by the stats + chart layers. */
export type ShotMetric =
  | "ball_speed"
  | "club_speed"
  | "smash_factor"
  | "launch_angle"
  | "launch_direction"
  | "spin_rate"
  | "spin_axis"
  | "backspin"
  | "sidespin"
  | "apex_height"
  | "carry_distance"
  | "total_distance"
  | "carry_deviation_angle"
  | "carry_deviation_distance"
  | "total_deviation_angle"
  | "total_deviation_distance"
  | "attack_angle"
  | "club_path"
  | "club_face"
  | "face_to_path";
