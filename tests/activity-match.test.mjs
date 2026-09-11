import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreActivityMatch,chooseActivityMatch} from '../supabase/functions/analyze-fit/analysis/activity-match.js';
const fit={startedAt:'2026-09-10T20:13:30Z',durationMin:49.1,distanceKm:2.12,avgHr:155};
test('FIT matches a close Health Connect activity',()=>{const candidate={id:'hc',started_at:'2026-09-10T20:13:15Z',duration_min:49.2,distance_km:2.081,avg_hr:154};const m=scoreActivityMatch(fit,candidate);assert.ok(m);assert.ok(m.score<.1);assert.equal(chooseActivityMatch(fit,[candidate]).activity.id,'hc')});
test('FIT rejects a nearby but incompatible workout',()=>{const candidate={id:'bike',started_at:'2026-09-10T19:57:34Z',duration_min:22.6,distance_km:5.2,avg_hr:120};assert.equal(scoreActivityMatch(fit,candidate),null);assert.equal(chooseActivityMatch(fit,[candidate]),null)});
test('ambiguous candidates are not auto-merged',()=>{const a={id:'a',started_at:'2026-09-10T20:13:20Z',duration_min:49,distance_km:2.1,avg_hr:155},b={id:'b',started_at:'2026-09-10T20:13:40Z',duration_min:49.2,distance_km:2.08,avg_hr:154};assert.equal(chooseActivityMatch(fit,[a,b]),null)});
