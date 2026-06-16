import fs from 'node:fs';
import path from 'node:path';
import PocketBase from 'pocketbase';

const EQUIVALENCE_STATUS_FIELD = 'webDesignModuleEquivalenceStatus';
const EQUIVALENCE_STATUS_VALUES = ['confirmed', 'doubtful', 'dismissed'];

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

function selectField(name, values) {
  return {
    type: 'select',
    name,
    required: false,
    presentable: false,
    hidden: false,
    maxSelect: 1,
    values,
  };
}

function mergeValues(existingValues, requiredValues) {
  return Array.from(new Set([...(existingValues || []), ...requiredValues]));
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

const usersCollection = await collectionExists(pb, 'users');
if (!usersCollection) {
  throw new Error('Missing users collection.');
}

const existingField = usersCollection.fields.find((field) => field.name === EQUIVALENCE_STATUS_FIELD);
let nextFields;

if (!existingField) {
  nextFields = [
    ...usersCollection.fields,
    selectField(EQUIVALENCE_STATUS_FIELD, EQUIVALENCE_STATUS_VALUES),
  ];
} else {
  if (existingField.type !== 'select') {
    throw new Error(`${EQUIVALENCE_STATUS_FIELD} exists but is not a select field.`);
  }

  const mergedValues = mergeValues(existingField.values, EQUIVALENCE_STATUS_VALUES);
  nextFields = usersCollection.fields.map((field) =>
    field.name === EQUIVALENCE_STATUS_FIELD
      ? {
          ...field,
          required: false,
          maxSelect: 1,
          values: mergedValues,
        }
      : field
  );
}

const changed = JSON.stringify(nextFields) !== JSON.stringify(usersCollection.fields);
if (!changed) {
  console.log('users.webDesignModuleEquivalenceStatus already up to date.');
} else {
  await pb.collections.update(usersCollection.id, { fields: nextFields });
  console.log('users.webDesignModuleEquivalenceStatus is ready.');
}
