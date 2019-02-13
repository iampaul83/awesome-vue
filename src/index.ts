require('dotenv').config();

import path from 'path';

import unified, { VFileCompatible } from 'unified';
import * as Unist from 'unist';
import parse from 'remark-parse';
import stringify from 'remark-stringify';
import vfile, { VFile } from 'vfile';
import { readFileSync, writeFileSync } from 'fs';
const visit = require('unist-util-visit');
import PQueue from 'p-queue';

import github from './github';

// unified()
//   .use(parse)
//   .use(stringify)
//   .process('# Hello world!', function(err, file) {
//     console.error(err);
//     console.log(String(file));
//   });

// const testPlugin: Attacher = params => (
//   tree: Unist.Node,
//   file: VFileCompatible
// ) => {};

function move(options: any) {
  var expected = (options || {}).extname;

  if (!expected) {
    throw new Error('Missing `extname` in options');
  }

  return transformer;

  async function transformer(tree: Unist.Node, file1: VFileCompatible) {
    const queue = new PQueue({ concurrency: 10 });
    visit(tree, 'link', (link: any) => {
      const { url } = link;
      if (!url) return;

      const match = url.match(`https://github.com/([^/]+)/([^/]+)/?$`);
      if (!match) return;

      const [_, owner, name] = match;

      queue.add(async () => {
        try {
          const { stars, newUrl } = await github(owner, name);
          link.children.push({
            type: 'text',
            value: ` ★${stars}`,
          });
          if (newUrl) {
            link.url = newUrl;
          }
        } catch (error) {
          console.log(`"${owner}/${name}" 查詢失敗, \n url = ${url}`);
          console.log(error);
          console.log('\n\n');
        }
      });
    });
    await queue.onIdle();

    return tree;
  }
}

(async () => {
  const vf = vfile({
    path: path.join(__dirname, '../README.md'),
    contents: readFileSync(path.join(__dirname, '../awesome-vue/README.md')),
  });
  await unified()
    .use(parse)
    .use(move, { extname: '.html' })
    .use(stringify)
    .process(vf);
  writeFileSync(vf.path!, vf.contents);
})();
