import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';
import OpenAI from 'openai';
import { OpenAiApiCredentials } from '../credentials';

export class OpenAINode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OpenAI',
    name: 'openAi',
    icon: 'fa:robot',
    group: ['ai'],
    version: 1,
    description: 'Use OpenAI models (GPT, DALL-E, Whisper)',
    defaults: {
      name: 'OpenAI',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'openAiApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
          { name: 'Chat', value: 'chat', description: 'Chat completions (GPT-4, GPT-3.5)' },
          { name: 'Image', value: 'image', description: 'Generate images (DALL-E)' },
          { name: 'Audio', value: 'audio', description: 'Transcribe audio (Whisper)' },
          { name: 'Embedding', value: 'embedding', description: 'Create embeddings' },
        ],
        default: 'chat',
        description: 'The resource to use',
      },
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['chat'],
          },
        },
        options: [
          { name: 'GPT-4', value: 'gpt-4' },
          { name: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
          { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        ],
        default: 'gpt-3.5-turbo',
        description: 'The model to use',
      },
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        typeOptions: {
          rows: 5,
        },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['chat', 'image'],
          },
        },
        description: 'The prompt to send to the model',
      },
      {
        displayName: 'System Message',
        name: 'systemMessage',
        type: 'string',
        default: 'You are a helpful assistant.',
        displayOptions: {
          show: {
            resource: ['chat'],
          },
        },
        description: 'System message to set assistant behavior',
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        default: 0.7,
        displayOptions: {
          show: {
            resource: ['chat'],
          },
        },
        description: 'Sampling temperature (0-2)',
      },
      {
        displayName: 'Max Tokens',
        name: 'maxTokens',
        type: 'number',
        default: 2000,
        displayOptions: {
          show: {
            resource: ['chat'],
          },
        },
        description: 'Maximum tokens in response',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('openAiApi') as OpenAiApiCredentials;
    const openai = new OpenAI({
      apiKey: credentials.apiKey as string,
    });

    const resource = this.getNodeParameter('resource', 0) as string;

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];
      
      for (let i = 0; i < inputData.length; i++) {
        try {
          if (resource === 'chat') {
            const model = this.getNodeParameter('model', i) as string;
            const prompt = this.getNodeParameter('prompt', i) as string;
            const systemMessage = this.getNodeParameter('systemMessage', i) as string;
            const temperature = this.getNodeParameter('temperature', i) as number;
            const maxTokens = this.getNodeParameter('maxTokens', i) as number;

            const completion = await openai.chat.completions.create({
              model,
              messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt },
              ],
              temperature,
              max_tokens: maxTokens,
            });

            returnData.push({
              json: {
                model,
                prompt,
                response: completion.choices[0].message.content,
                usage: completion.usage,
                finishReason: completion.choices[0].finish_reason,
              },
            });
          } else if (resource === 'image') {
            const prompt = this.getNodeParameter('prompt', i) as string;

            const image = await openai.images.generate({
              model: 'dall-e-3',
              prompt,
              n: 1,
              size: '1024x1024',
            });

            const firstImage = image.data?.[0];
            returnData.push({
              json: {
                prompt,
                imageUrl: firstImage?.url || '',
                revisedPrompt: firstImage?.revised_prompt || '',
              },
            });
          } else if (resource === 'embedding') {
            const text = inputData[i].json.text as string || this.getNodeParameter('prompt', i) as string;

            const embedding = await openai.embeddings.create({
              model: 'text-embedding-ada-002',
              input: text,
            });

            returnData.push({
              json: {
                text,
                embedding: embedding.data[0].embedding,
                usage: embedding.usage,
              },
            });
          }
        } catch (error: any) {
          returnData.push({
            json: {
              error: error.message,
              resource,
            },
          });
        }
      }
    }

    return [returnData];
  }
}
