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
    console.log(`${name} late delivery fields already up to date.`);
    return collection;
  }

  const updated = await pb.collections.update(collection.id, { fields });
  console.log(`updated ${name} late delivery fields`);
  return updated;
}

const boolField = (name) => ({
  type: 'bool',
  name,
  required: false,
  presentable: false,
  hidden: false,
});

const dateField = (name) => ({
  type: 'date',
  name,
  required: false,
  presentable: false,
  hidden: false,
  min: '',
  max: '',
});

function withLateDeliveryFields(fields) {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'submittedLate')) {
    nextFields.push(boolField('submittedLate'));
  }
  if (!nextFields.some((field) => field.name === 'submittedLateAt')) {
    nextFields.push(dateField('submittedLateAt'));
  }
  if (!nextFields.some((field) => field.name === 'deliveryLimitAt')) {
    nextFields.push(dateField('deliveryLimitAt'));
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

await ensureCollectionFields(pb, 'deliveries', withLateDeliveryFields);

console.log('Late delivery fields are ready.');
