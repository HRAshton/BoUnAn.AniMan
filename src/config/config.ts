// process.env.AWS_PROFILE = '';
// process.env.LOAN_API_TOKEN = '';
// process.env.LOAN_API_MAX_CONCURRENT_REQUESTS = '';
// process.env.DATABASE_TABLE_NAME = '';
// process.env.DATABASE_ANIMEKEY_INDEX_NAME = '';
// process.env.DATABASE_SECONDARY_INDEX_NAME = '';
// process.env.DATABASE_MATCHER_SECONDARY_INDEX_NAME = '';
// process.env.VIDEO_REGISTERED_TOPIC_ARN = '';
// process.env.VIDEO_DOWNLOADED_TOPIC_ARN = '';
// process.env.SCENE_RECOGNISED_TOPIC_ARN = '';


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

const getEnv = (key: string): string => {
    const value = process.env[key];

    if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
    }

    return value;
}

export const config: Config = {
    loanApiConfig: {
        token: getEnv('LOAN_API_TOKEN'),
        maxConcurrentRequests: parseInt(getEnv('LOAN_API_MAX_CONCURRENT_REQUESTS')),
    },
    database: {
        tableName: getEnv('DATABASE_TABLE_NAME'),
        animeKeyIndexName: getEnv('DATABASE_ANIMEKEY_INDEX_NAME'),
        secondaryIndexName: getEnv('DATABASE_SECONDARY_INDEX_NAME'),
        matcherSecondaryIndexName: getEnv('DATABASE_MATCHER_SECONDARY_INDEX_NAME'),
    },
    topics: {
        videoRegisteredTopicArn: getEnv('VIDEO_REGISTERED_TOPIC_ARN'),
        videoDownloadedTopicArn: getEnv('VIDEO_DOWNLOADED_TOPIC_ARN'),
        sceneRecognisedTopicArn: getEnv('SCENE_RECOGNISED_TOPIC_ARN'),
    },
}