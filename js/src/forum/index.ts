// js/src/forum/index.ts

import app from 'flarum/forum/app';
import registerWidget from '../common/register';
import { extName } from '../common/extName';

app.initializers.add(extName, () => {
  registerWidget(app);
});
