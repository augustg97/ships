/* ── ONE HOUR PER FRAME ──────────────────────────────────────────────────────────────────
 * The near field's lights already model night: below a grazing sun the key drops to a
 * moonlit level instead of going under (passage.js). The shaders never got the same model.
 * The sky stayed at noon, the sea kept its daytime body, and the ground went to black on
 * its own schedule — measured on the Ten-ichi-go close-up, where the local sun is 19° under
 * the horizon: a full-day sky over a day-bright sea over a coast multiplied down to 0.10,
 * three different times of day in one frame, and the coast read as a black paper strip.
 *
 * The hour is ONE fact about the frame. Every near-field shader takes its brightness from
 * this term and holds this floor, so a night frame is a moonlit scene everywhere or nowhere.
 * The floor is the light rig's own: hemi 0.55 / 1.55 ≈ 0.35, key 0.30 — the ship holds
 * about a third of her daylight value at night, and now so does everything around her.
 * At day = 1 the factor is identity, so the day side of the planet does not move a pixel.
 */
float atmoDay(vec3 L){ return smoothstep(-0.26, 0.20, normalize(L).y); }
const float ATMO_NIGHT = 0.32;
float atmoBright(vec3 L){ return mix(ATMO_NIGHT, 1.0, atmoDay(L)); }
