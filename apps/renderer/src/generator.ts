import { findElementsByTagName } from './parser';
import { ParsedHtml } from './type';

export async function generateFilterComplex({ ast, css }: ParsedHtml) {
  const project = findElementsByTagName(ast, 'project');
  const sequences = findElementsByTagName(project[0], 'sequence');

  let filterComplex: string[] = [];

  for (const sequence of sequences) {
    // "[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]"
    // or xfade, but concat is faster
    const fragments = findElementsByTagName(sequence, 'fragment');
    filterComplex.push(
      `${fragments.map((_, index) => `[${index}:v]`).join('')}concat=n=${fragments.length}:v=1:a=0[outv]`,
    );
  }

  return filterComplex.join(';');
}
