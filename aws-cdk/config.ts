import configFile from './configuration.json';

interface Config {
    alertEmail: string;
    loanApiToken: string;
}

export const config: Config = configFile;

if (!config.alertEmail) {
    throw new Error('errorAlarmEmail is required');
}
if (!config.loanApiToken) {
    throw new Error('telegramToken is required');
}