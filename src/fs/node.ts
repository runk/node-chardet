let fsModule: any;

export default () => {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    fsModule = fsModule ? fsModule : require('fs');
    return fsModule;
  }
  throw new Error('File system is not available');
};
