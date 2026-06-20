import { buildCorpus, filesBelow, generated } from './corpus-utils.mjs';

buildCorpus(generated);
console.log(`Built ${filesBelow(generated).length} corpus files.`);
