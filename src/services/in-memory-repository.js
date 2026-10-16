function copy(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function matches(record, where) {
  return Object.entries(where).every(([key, value]) => record[key] === value);
}

export function createInMemoryRepository(seed = {}) {
  let sequence = 0;
  const collections = new Map();

  for (const [name, records] of Object.entries(seed)) {
    collections.set(name, new Map(records.map((record) => [record.id, copy(record)])));
  }

  const collection = (name) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  };

  const repository = {
    newId(prefix) {
      sequence += 1;
      return `${prefix}_${String(sequence).padStart(4, '0')}`;
    },
    async get(name, id) {
      return copy(collection(name).get(id));
    },
    async put(name, record) {
      collection(name).set(record.id, copy(record));
      return copy(record);
    },
    async delete(name, id) {
      return collection(name).delete(id);
    },
    async list(name, where = {}) {
      return [...collection(name).values()].filter((record) => matches(record, where)).map(copy);
    },
    async transaction(work) {
      const snapshot = structuredClone(collections);
      const startingSequence = sequence;
      try {
        return await work(repository);
      } catch (error) {
        collections.clear();
        for (const [name, records] of snapshot) collections.set(name, records);
        sequence = startingSequence;
        throw error;
      }
    },
  };

  return repository;
}
