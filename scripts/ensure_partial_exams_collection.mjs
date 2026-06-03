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

const dateField = (name) => ({
  type: 'date',
  name,
  required: false,
  presentable: false,
  hidden: false,
  min: '',
  max: '',
});

const relationField = (name, collectionId, maxSelect = 1) => ({
  type: 'relation',
  name,
  required: false,
  presentable: false,
  hidden: false,
  collectionId,
  cascadeDelete: false,
  minSelect: 0,
  maxSelect,
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

const teacherOnly = '@request.auth.role = "docente"';
const publishedStudentSimulation =
  '@request.auth.role = "docente" || (@request.auth.role = "estudiante" && status = "Publicado" && title = "Simulacro Mundial FIFA 2026")';
const teacherOrStudent = '@request.auth.role = "docente" || @request.auth.role = "estudiante"';
const selectedQuestionsForStudents =
  '@request.auth.role = "docente" || (@request.auth.role = "estudiante" && selected = true)';
const teacherOrOwnStudentSimulation =
  '@request.auth.role = "docente" || (@request.auth.role = "estudiante" && student = @request.auth.id)';
const ownStudentSimulationCreate = '@request.auth.role = "estudiante" && student = @request.auth.id';

await ensureCollection(pb, {
  name: 'partial_exams',
  type: 'base',
  listRule: publishedStudentSimulation,
  viewRule: publishedStudentSimulation,
  createRule: teacherOnly,
  updateRule: teacherOnly,
  deleteRule: teacherOnly,
  fields: [
    {
      type: 'text',
      name: 'title',
      required: true,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
    {
      type: 'editor',
      name: 'description',
      required: false,
      presentable: false,
      hidden: false,
      maxSize: 0,
      convertURLs: false,
    },
    {
      ...dateField('startsAt'),
    },
    {
      ...dateField('endsAt'),
    },
    {
      type: 'text',
      name: 'topics',
      required: false,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
    {
      type: 'select',
      name: 'status',
      required: false,
      presentable: false,
      hidden: false,
      maxSelect: 1,
      values: ['Planificado', 'Publicado', 'Finalizado'],
    },
  ],
  indexes: [],
});

await ensureCollectionRules(pb, 'partial_exams', {
  listRule: publishedStudentSimulation,
  viewRule: publishedStudentSimulation,
});

const partialExamsCollection = await collectionExists(pb, 'partial_exams');
const usersCollection = await collectionExists(pb, 'users');

if (!partialExamsCollection || !usersCollection) {
  throw new Error('Missing required collections for partial exam simulations.');
}

await ensureCollection(pb, {
  name: 'partial_exam_simulations',
  type: 'base',
  listRule: teacherOrOwnStudentSimulation,
  viewRule: teacherOrOwnStudentSimulation,
  createRule: ownStudentSimulationCreate,
  updateRule: null,
  deleteRule: null,
  fields: [
    {
      ...relationField('partialExam', partialExamsCollection.id, 1),
      required: true,
      minSelect: 1,
    },
    {
      ...relationField('student', usersCollection.id, 1),
      required: true,
      minSelect: 1,
    },
    {
      type: 'number',
      name: 'score',
      required: true,
      presentable: false,
      hidden: false,
      min: 0,
      max: null,
      onlyInt: true,
    },
    {
      type: 'number',
      name: 'totalQuestions',
      required: true,
      presentable: false,
      hidden: false,
      min: 0,
      max: null,
      onlyInt: true,
    },
    {
      type: 'number',
      name: 'answeredQuestions',
      required: true,
      presentable: false,
      hidden: false,
      min: 0,
      max: null,
      onlyInt: true,
    },
    {
      type: 'json',
      name: 'questionIds',
      required: true,
      presentable: false,
      hidden: false,
      maxSize: 0,
    },
    {
      type: 'json',
      name: 'answers',
      required: true,
      presentable: false,
      hidden: false,
      maxSize: 0,
    },
    {
      type: 'select',
      name: 'finishReason',
      required: true,
      presentable: false,
      hidden: false,
      maxSelect: 1,
      values: ['manual', 'time'],
    },
    {
      ...dateField('completedAt'),
      required: true,
    },
  ],
  indexes: [],
});

await ensureCollectionRules(pb, 'partial_exam_simulations', {
  listRule: teacherOrOwnStudentSimulation,
  viewRule: teacherOrOwnStudentSimulation,
  createRule: ownStudentSimulationCreate,
  updateRule: null,
  deleteRule: null,
});

const partialExamsWithLegacyDate = await ensureCollectionFields(pb, 'partial_exams', (fields) => {
  const nextFields = [...fields];
  if (!nextFields.some((field) => field.name === 'startsAt')) {
    nextFields.push(dateField('startsAt'));
  }
  if (!nextFields.some((field) => field.name === 'endsAt')) {
    nextFields.push(dateField('endsAt'));
  }
  return nextFields;
});

if (partialExamsWithLegacyDate?.fields.some((field) => field.name === 'examDate')) {
  const legacyRecords = await pb.collection('partial_exams').getFullList();
  for (const record of legacyRecords) {
    if (record.examDate && !record.startsAt) {
      await pb.collection('partial_exams').update(record.id, {
        startsAt: record.examDate,
      });
      console.log(`migrated examDate to startsAt for ${record.id}`);
    }
  }

  await ensureCollectionFields(pb, 'partial_exams', (fields) => fields.filter((field) => field.name !== 'examDate'));
}

const unitsCollection = await ensureCollection(pb, {
  name: 'partial_exam_units',
  type: 'base',
  listRule: teacherOrStudent,
  viewRule: teacherOrStudent,
  createRule: teacherOnly,
  updateRule: teacherOnly,
  deleteRule: teacherOnly,
  fields: [
    {
      type: 'text',
      name: 'name',
      required: true,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
    {
      type: 'text',
      name: 'description',
      required: false,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
    {
      type: 'number',
      name: 'order',
      required: false,
      presentable: false,
      hidden: false,
      min: null,
      max: null,
      onlyInt: true,
    },
  ],
  indexes: [],
});

await ensureCollectionRules(pb, 'partial_exam_units', {
  listRule: teacherOrStudent,
  viewRule: teacherOrStudent,
});

await ensureCollectionFields(pb, 'partial_exams', (fields) => {
  if (fields.some((field) => field.name === 'questionBanks')) {
    return fields;
  }

  return [
    ...fields,
    relationField('questionBanks', unitsCollection.id, 0),
  ];
});

const documentsCollection = await ensureCollection(pb, {
  name: 'partial_exam_unit_documents',
  type: 'base',
  listRule: teacherOnly,
  viewRule: teacherOnly,
  createRule: teacherOnly,
  updateRule: teacherOnly,
  deleteRule: teacherOnly,
  fields: [
    {
      type: 'relation',
      name: 'unit',
      required: true,
      presentable: false,
      hidden: false,
      collectionId: unitsCollection.id,
      cascadeDelete: true,
      minSelect: 1,
      maxSelect: 1,
    },
    {
      type: 'text',
      name: 'title',
      required: true,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
    {
      type: 'file',
      name: 'file',
      required: true,
      presentable: false,
      hidden: false,
      maxSelect: 1,
      maxSize: 26214400,
      mimeTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      protected: false,
      thumbs: [],
    },
    {
      type: 'text',
      name: 'originalName',
      required: false,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
  ],
  indexes: [],
});

await ensureCollection(pb, {
  name: 'partial_exam_questions',
  type: 'base',
  listRule: selectedQuestionsForStudents,
  viewRule: selectedQuestionsForStudents,
  createRule: teacherOnly,
  updateRule: teacherOnly,
  deleteRule: teacherOnly,
  fields: [
    {
      type: 'relation',
      name: 'unit',
      required: true,
      presentable: false,
      hidden: false,
      collectionId: unitsCollection.id,
      cascadeDelete: true,
      minSelect: 1,
      maxSelect: 1,
    },
    {
      type: 'relation',
      name: 'document',
      required: false,
      presentable: false,
      hidden: false,
      collectionId: documentsCollection.id,
      cascadeDelete: false,
      minSelect: 0,
      maxSelect: 1,
    },
    {
      type: 'text',
      name: 'question',
      required: true,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
    {
      type: 'json',
      name: 'options',
      required: true,
      presentable: false,
      hidden: false,
      maxSize: 0,
    },
    {
      type: 'text',
      name: 'correctOptionId',
      required: true,
      presentable: false,
      hidden: false,
      min: 0,
      max: 16,
      pattern: '',
      autogeneratePattern: '',
    },
    {
      type: 'text',
      name: 'explanation',
      required: false,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
    {
      type: 'select',
      name: 'difficulty',
      required: false,
      presentable: false,
      hidden: false,
      maxSelect: 1,
      values: ['Basica', 'Intermedia', 'Avanzada'],
    },
    {
      type: 'bool',
      name: 'selected',
      required: false,
      presentable: false,
      hidden: false,
    },
    {
      type: 'text',
      name: 'sourceReference',
      required: false,
      presentable: false,
      hidden: false,
      min: 0,
      max: 0,
      pattern: '',
      autogeneratePattern: '',
    },
  ],
  indexes: [],
});

await ensureCollectionRules(pb, 'partial_exam_questions', {
  listRule: selectedQuestionsForStudents,
  viewRule: selectedQuestionsForStudents,
});

const questionsCollection = await collectionExists(pb, 'partial_exam_questions');
if (questionsCollection && !questionsCollection.fields.some((field) => field.name === 'kind')) {
  await pb.collections.update(questionsCollection.id, {
    fields: [
      ...questionsCollection.fields,
      {
        type: 'select',
        name: 'kind',
        required: false,
        presentable: false,
        hidden: false,
        maxSelect: 1,
        values: [
          'Conceptual',
          'Detectar error en codigo',
          'Explicar fragmento de codigo',
          'Elegir codigo para necesidad',
        ],
      },
    ],
  });
  console.log('added kind to partial_exam_questions');
}
