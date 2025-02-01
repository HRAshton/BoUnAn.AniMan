import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export const fetchSsmValue = async (parameterName: string): Promise<object> => {
    const command = new GetParameterCommand({ Name: parameterName });

    const ssmClient = new SSMClient();
    const response = await ssmClient.send(command);

    const json = response.Parameter?.Value;
    if (!json) {
        throw new Error('No config found');
    }

    return JSON.parse(json);
}