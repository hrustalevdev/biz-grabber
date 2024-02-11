import { exec } from 'child_process';
import inquirer from 'inquirer';
import { promisify } from 'util';

const execAsync = promisify(exec);

const release = async () => {
  try {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'increment',
        message: 'Select the type of increment:',
        choices: ['patch', 'minor', 'major'],
      },
    ]);

    const { increment } = answer;

    const { stdout, stderr } = await execAsync(`npm version ${increment}`);
    stdout && console.log(stdout);
    stderr && console.error(stderr);

    const { stdout: gitStdout, stderr: gitStderr } =
      await execAsync('git push --tags');

    gitStdout && console.log(gitStdout);
    gitStderr && console.error(gitStderr);
  } catch (error) {
    console.error(`Error: ${error}`);
  }
};

release();
