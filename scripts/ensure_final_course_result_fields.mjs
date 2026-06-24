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

async function ensureCollectionFields(pb, name, updateFields) {
  const collection = await collectionExists(pb, name);
  if (!collection) {
    throw new Error(`Missing ${name} collection.`);
  }

  const fields = updateFields(collection.fields);
  const changed = JSON.stringify(fields) !== JSON.stringify(collection.fields);
  if (!changed) {
    console.log(`${name} final course result fields already up to date.`);
    return collection;
  }

  const updated = await pb.collections.update(collection.id, { fields });
  console.log(`updated ${name} final course result fields`);
  return updated;
}

const selectField = (name, values) => ({
  type: 'select',
  name,
  required: false,
  presentable: false,
  hidden: false,
  values,
  maxSelect: 1,
});

const numberField = (name) => ({
  type: 'number',
  name,
  required: false,
  presentable: false,
  hidden: false,
  min: 1,
  max: 10,
  onlyInt: true,
});

function withFinalCourseResultFields(fields) {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'finalCourseStatus')) {
    nextFields.push(selectField('finalCourseStatus', ['Promociona', 'Regulariza', 'En carrera', 'Libre']));
  }
  if (!nextFields.some((field) => field.name === 'finalCourseGrade')) {
    nextFields.push(numberField('finalCourseGrade'));
  }
  return nextFields;
}

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

await ensureCollectionFields(pb, 'users', withFinalCourseResultFields);
await ensureCollectionFields(pb, 'external_siu_students', withFinalCourseResultFields);

console.log('Final course result fields are ready.');
