import app from 'flarum/forum/app';
import registerWidget from '../common/register';

app.initializers.add('lady-byron-trends', () => {
  registerWidget(app);
});
