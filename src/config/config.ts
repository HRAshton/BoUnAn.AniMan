import { fetchSsmValue } from './ssm-client';


interface LoanApiConfig {
    token: string;
    maxConcurrentRequests: number;
}

interface DatabaseConfig {
    tableName: string;
    animeKeyIndexName: string;
    secondaryIndexName: string;
    matcherSecondaryIndexName: string;
}

interface Topics {
    videoRegisteredTopicArn: string;
    videoDownloadedTopicArn: string;
    sceneRecognisedTopicArn: string;
}

export interface Config {
    loanApiConfig: LoanApiConfig;
    database: DatabaseConfig;
    topics: Topics;
}

let cachedConfig: Config | undefined;

export const initConfig = async (): Promise<void> => {
    cachedConfig = await fetchSsmValue('/bounan/animan/runtime-config') as Config;
}

export const config = {
    get value() {
        if (!cachedConfig) {
            throw new Error('Config not initialized');
        }

        return cachedConfig;
    },
}