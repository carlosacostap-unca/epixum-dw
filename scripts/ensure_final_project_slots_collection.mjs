import fs from 'node:fs';
import path from 'node:path';
import PocketBase from 'pocketbase';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function collectionExists(pb, name) {
  try {
    return await pb.collections.getOne(name);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function ensureCollection(pb, schema) {
  const existing = await collectionExists(pb, schema.name);
  if (existing) {
    console.log(`${schema.name} already exists`);
    return existing;
  }

  const created = await pb.collections.create(schema);
  console.log(`created ${created.name} ${created.id}`);
  return created;
}

async function ensureCollectionRules(pb, name, rules) {
  const collection = await collectionExists(pb, name);
  if (!collection) return null;

  const needsUpdate = Object.entries(rules).some(([key, value]) => collection[key] !== value);
  if (!needsUpdate) {
    console.log(`${name} rules already up to date`);
    return collection;
  }

  const updated = await pb.collections.update(collection.id, rules);
  console.log(`updated ${name} rules`);
  return updated;
}

async function ensureCollectionFields(pb, name, updateFields) {
  const collection = await collectionExists(pb, name);
  if (!collection) return null;

  const fields = updateFields(collection.fields);
  const changed = JSON.stringify(fields) !== JSON.stringify(collection.fields);
  if (!changed) {
    console.log(`${name} fields already up to date`);
    return collection;
  }

  const updated = await pb.collections.update(collection.id, { fields });
  console.log(`updated ${name} fields`);
  return updated;
}

async function ensureCollectionIndexes(pb, name, indexes) {
  const collection = await collectionExists(pb, name);
  if (!collection) return null;

  const existingIndexes = collection.indexes || [];
  const missingIndexes = indexes.filter((index) => !existingIndexes.includes(index));
  if (missingIndexes.length === 0) {
    console.log(`${name} indexes already up to date`);
    return collection;
  }

  const updated = await pb.collections.update(collection.id, {
    indexes: [...existingIndexes, ...missingIndexes],
  });
  console.log(`updated ${name} indexes`);
  return updated;
}

const dateField = (name, required = false) => ({
  type: 'date',
  name,
  required,
  presentable: false,
  hidden: false,
  min: '',
  max: '',
});

const textField = (name, required = false) => ({
  type: 'text',
  name,
  required,
  presentable: false,
  hidden: false,
  min: 0,
  max: 0,
  pattern: '',
  autogeneratePattern: '',
});

const urlField = (name, required = false) => ({
  type: 'url',
  name,
  required,
  presentable: false,
  hidden: false,
  exceptDomains: [],
  onlyDomains: [],
});

const selectField = (name, values, required = false) => ({
  type: 'select',
  name,
  required,
  presentable: false,
  hidden: false,
  values,
  maxSelect: 1,
});

const fileField = (name, required = false) => ({
  type: 'file',
  name,
  required,
  presentable: false,
  hidden: false,
  maxSelect: 1,
  maxSize: 52428800,
  mimeTypes: [],
  protected: false,
  thumbs: [],
});

const relationField = (name, collectionId, required = false) => ({
  type: 'relation',
  name,
  required,
  presentable: false,
  hidden: false,
  collectionId,
  cascadeDelete: false,
  minSelect: required ? 1 : 0,
  maxSelect: 1,
});

loadEnvFile(path.join(process.cwd(), '.env.local'));

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_ADMIN;
const password = process.env.POCKETBASE_PASSWORD;

if (!url || !email || !password) {
  throw new Error('Missing PocketBase environment variables.');
}

const pb = new PocketBase(url);
pb.autoCancellation(false);

try {
  await pb.collection('_superusers').authWithPassword(email, password);
} catch {
  await pb.admins.authWithPassword(email, password);
}

const teamsCollection = await collectionExists(pb, 'teams');
const usersCollection = await collectionExists(pb, 'users');

if (!teamsCollection || !usersCollection) {
  throw new Error('Missing teams or users collection.');
}

const teacherOrAdmin = '@request.auth.role = "docente" || @request.auth.role = "admin"';
const authenticated = '@request.auth.id != ""';
const indexes = [
  'CREATE UNIQUE INDEX `idx_final_project_slots_start` ON `final_project_presentation_slots` (`startsAt`)',
  'CREATE UNIQUE INDEX `idx_final_project_slots_team` ON `final_project_presentation_slots` (`team`) WHERE `team` != ""',
];
const reservationIndexes = [
  'CREATE UNIQUE INDEX `idx_final_project_slot_reservations_slot` ON `final_project_slot_reservations` (`slot`)',
  'CREATE UNIQUE INDEX `idx_final_project_slot_reservations_team` ON `final_project_slot_reservations` (`team`)',
];
const resourceIndexes = [
  'CREATE UNIQUE INDEX `idx_final_project_team_resources_team_key` ON `final_project_team_resources` (`team`, `resourceKey`)',
];

await ensureCollection(pb, {
  name: 'final_project_presentation_slots',
  type: 'base',
  listRule: authenticated,
  viewRule: authenticated,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
  fields: [
    dateField('startsAt', true),
    dateField('endsAt', true),
    relationField('team', teamsCollection.id),
    relationField('reservedBy', usersCollection.id),
    dateField('reservedAt'),
  ],
  indexes,
});

await ensureCollectionRules(pb, 'final_project_presentation_slots', {
  listRule: authenticated,
  viewRule: authenticated,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'final_project_presentation_slots', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'startsAt')) {
    nextFields.push(dateField('startsAt', true));
  }
  if (!nextFields.some((field) => field.name === 'endsAt')) {
    nextFields.push(dateField('endsAt', true));
  }
  if (!nextFields.some((field) => field.name === 'team')) {
    nextFields.push(relationField('team', teamsCollection.id));
  }
  if (!nextFields.some((field) => field.name === 'reservedBy')) {
    nextFields.push(relationField('reservedBy', usersCollection.id));
  }
  if (!nextFields.some((field) => field.name === 'reservedAt')) {
    nextFields.push(dateField('reservedAt'));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'final_project_presentation_slots', indexes);

const slotsCollection = await collectionExists(pb, 'final_project_presentation_slots');
if (!slotsCollection) {
  throw new Error('Missing final project presentation slots collection.');
}

await ensureCollection(pb, {
  name: 'final_project_slot_reservations',
  type: 'base',
  listRule: authenticated,
  viewRule: authenticated,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
  fields: [
    relationField('slot', slotsCollection.id, true),
    relationField('team', teamsCollection.id, true),
    relationField('reservedBy', usersCollection.id, true),
    dateField('reservedAt', true),
  ],
  indexes: reservationIndexes,
});

await ensureCollectionRules(pb, 'final_project_slot_reservations', {
  listRule: authenticated,
  viewRule: authenticated,
  createRule: teacherOrAdmin,
  updateRule: teacherOrAdmin,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'final_project_slot_reservations', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'slot')) {
    nextFields.push(relationField('slot', slotsCollection.id, true));
  }
  if (!nextFields.some((field) => field.name === 'team')) {
    nextFields.push(relationField('team', teamsCollection.id, true));
  }
  if (!nextFields.some((field) => field.name === 'reservedBy')) {
    nextFields.push(relationField('reservedBy', usersCollection.id, true));
  }
  if (!nextFields.some((field) => field.name === 'reservedAt')) {
    nextFields.push(dateField('reservedAt', true));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'final_project_slot_reservations', reservationIndexes);

const [slots, reservations] = await Promise.all([
  pb.collection('final_project_presentation_slots').getFullList({ sort: 'startsAt' }),
  pb.collection('final_project_slot_reservations').getFullList(),
]);
const reservationBySlot = new Set(reservations.map((reservation) => reservation.slot));

for (const slot of slots) {
  if (!slot.team || reservationBySlot.has(slot.id)) continue;

  await pb.collection('final_project_slot_reservations').create({
    slot: slot.id,
    team: slot.team,
    reservedBy: slot.reservedBy,
    reservedAt: slot.reservedAt || new Date().toISOString(),
  });
  console.log(`migrated reservation for slot ${slot.id}`);
}

await ensureCollection(pb, {
  name: 'final_project_team_resources',
  type: 'base',
  listRule: authenticated,
  viewRule: authenticated,
  createRule: authenticated,
  updateRule: authenticated,
  deleteRule: teacherOrAdmin,
  fields: [
    relationField('team', teamsCollection.id, true),
    selectField('resourceKey', ['agile_tp2', 'agile_tp3', 'ux_figma', 'web_deployed_site'], true),
    textField('moduleName', true),
    textField('title', true),
    selectField('kind', ['file', 'url'], true),
    urlField('url'),
    fileField('file'),
    textField('originalName'),
    relationField('submittedBy', usersCollection.id),
    dateField('submittedAt'),
  ],
  indexes: resourceIndexes,
});

await ensureCollectionRules(pb, 'final_project_team_resources', {
  listRule: authenticated,
  viewRule: authenticated,
  createRule: authenticated,
  updateRule: authenticated,
  deleteRule: teacherOrAdmin,
});

await ensureCollectionFields(pb, 'final_project_team_resources', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'team')) {
    nextFields.push(relationField('team', teamsCollection.id, true));
  }
  if (!nextFields.some((field) => field.name === 'resourceKey')) {
    nextFields.push(selectField('resourceKey', ['agile_tp2', 'agile_tp3', 'ux_figma', 'web_deployed_site'], true));
  }
  if (!nextFields.some((field) => field.name === 'moduleName')) {
    nextFields.push(textField('moduleName', true));
  }
  if (!nextFields.some((field) => field.name === 'title')) {
    nextFields.push(textField('title', true));
  }
  if (!nextFields.some((field) => field.name === 'kind')) {
    nextFields.push(selectField('kind', ['file', 'url'], true));
  }
  if (!nextFields.some((field) => field.name === 'url')) {
    nextFields.push(urlField('url'));
  }
  if (!nextFields.some((field) => field.name === 'file')) {
    nextFields.push(fileField('file'));
  }
  if (!nextFields.some((field) => field.name === 'originalName')) {
    nextFields.push(textField('originalName'));
  }
  if (!nextFields.some((field) => field.name === 'submittedBy')) {
    nextFields.push(relationField('submittedBy', usersCollection.id));
  }
  if (!nextFields.some((field) => field.name === 'submittedAt')) {
    nextFields.push(dateField('submittedAt'));
  }
  return nextFields;
});

await ensureCollectionIndexes(pb, 'final_project_team_resources', resourceIndexes);

console.log('Final project presentation slots collection is ready.');
