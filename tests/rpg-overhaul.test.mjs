import test from 'node:test';
import assert from 'node:assert/strict';
import {activityXp} from '../rpg-overhaul.js';

test('all real activities earn XP',()=>{
 const sports=['football','run','cycling','gym','walk'];
 for(const activity_type of sports){
  assert.ok(activityXp({activity_type,duration_min:30,moving_time_min:30,rpe:0,distance_km:0})>=15);
 }
});

test('harder longer activity earns more XP but is capped',()=>{
 const easy=activityXp({activity_type:'cycling',duration_min:25,moving_time_min:25,rpe:3,distance_km:8});
 const hard=activityXp({activity_type:'football',duration_min:90,moving_time_min:85,rpe:9,distance_km:10});
 const absurd=activityXp({activity_type:'football',duration_min:9999,moving_time_min:9999,rpe:10,distance_km:500});
 assert.ok(hard>easy);
 assert.equal(absurd,180);
});
