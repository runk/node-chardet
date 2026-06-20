import {
  buildModels,
  generatedEvaluation,
  generatedModel,
} from './model-utils.mjs';

buildModels(generatedModel, generatedEvaluation);
console.log('Built detector models and held-out evaluation.');
