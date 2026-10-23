import test from 'node:test';
import assert from 'node:assert/strict';
import { createJiangnanObjectState } from '../assets/js/space/jiangnan-furnishings-state.mjs';

test('each physical light toggles independently and unknown objects do not mutate the room', () => {
  const room = createJiangnanObjectState();
  assert.deepEqual(room.toggle('lamp'), { kind: 'lamp', on: false });
  assert.equal(room.snapshot().lamp, false);
  assert.equal(room.snapshot()['shelf-light'], true);
  assert.deepEqual(room.toggle('shelf-light'), { kind: 'shelf-light', on: false });
  const before = room.snapshot();
  assert.equal(room.toggle('unowned-object'), null);
  assert.deepEqual(room.snapshot(), before);
});

test('the fan coasts down, retains its phase and accelerates smoothly after restarting', () => {
  const room = createJiangnanObjectState();
  room.update(0);
  for (let i = 1; i <= 30; i++) room.update(i / 30);
  const running = room.snapshot();
  assert.ok(running.fanSpeed > 0);
  room.toggle('fan');
  room.update(1.1);
  const coasting = room.snapshot();
  assert.ok(coasting.fanSpeed > 0 && coasting.fanSpeed < running.fanSpeed);
  assert.ok(coasting.fanPhase > running.fanPhase);
  for (let i = 34; i <= 330; i++) room.update(i / 30);
  const stopped = room.snapshot();
  assert.equal(stopped.fanSpeed, 0);
  room.toggle('fan');
  assert.equal(room.snapshot().fanPhase, stopped.fanPhase);
  room.update(11.05);
  assert.ok(room.snapshot().fanSpeed > 0 && room.snapshot().fanSpeed < running.fanSpeed);
});

test('the music platter moves only after confirmed playback and updates its selected label', () => {
  const room = createJiangnanObjectState({ recordIds: ['jazz', 'piano'] });
  room.update(0);
  room.setAudioState({ wanted: true, status: 'loading', trackId: 'piano' });
  room.update(.1);
  assert.equal(room.snapshot().platterAngle, 0);
  assert.equal(room.snapshot().recordId, 'piano');
  room.setAudioState({ playing: true, wanted: true, trackId: 'piano' });
  room.update(.2);
  const played = room.snapshot().platterAngle;
  assert.ok(played > 0);
  room.setAudioState({ playing: false, wanted: true, status: 'blocked' });
  room.update(.3);
  assert.equal(room.snapshot().platterAngle, played);
  room.setAudioState({ trackId: 'missing' });
  assert.equal(room.snapshot().recordId, 'piano');
});

test('a frozen room clock does not advance fan, steam, pendulum or platter', () => {
  const room = createJiangnanObjectState();
  room.update(3);
  room.setAudioState({ playing: true });
  room.update(3.05);
  const frozen = room.snapshot();
  for (let i = 0; i < 50; i++) room.update(3.05);
  assert.deepEqual(room.snapshot(), frozen);
  room.update(300);
  assert.ok(room.snapshot().platterAngle - frozen.platterAngle <= .35);
  room.update(NaN);
  assert.ok(Number.isFinite(room.snapshot().fanPhase));
});

test('an espresso cycle advances on the room clock, stops after eight seconds and can be cancelled', () => {
  const room = createJiangnanObjectState();
  room.update(0);
  assert.deepEqual(room.toggle('espresso'), {kind:'espresso', on:true});
  for (let i = 1; i <= 10; i++) room.update(i / 10);
  assert.ok(room.snapshot().brewProgress > 0);
  assert.equal(room.snapshot().espresso, true);
  for (let i = 11; i <= 85; i++) room.update(i / 10);
  assert.equal(room.snapshot().espresso, false);
  room.toggle('espresso'); room.toggle('espresso');
  assert.equal(room.snapshot().espresso, false);
});
