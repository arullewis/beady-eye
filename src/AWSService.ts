import { Credentials } from 'aws-sdk'
import { IamRole } from './IAM'

let net = require('net')

export class AWSService {
    /// AWS Client base class, providing generic validation services to AWS instances
    typeName: string
    name: string
    region: string
    role: IamRole
    serviceClientType: function
    lazyServiceClient?: AwsRDS

    constructor(typeName: string, clientType, name: string, region: string, role?: IamRole) {
        this.typeName = typeName;
        this.serviceClientType = clientType;
        this.name = name;
        this.region = region;
        this.role = role;
    }

    async makeClient(withRole?: IamRole) {
      const tempCreds = withRole ? await withRole.credentials() : undefined;

      // Make EC2 client from the credentials
      this.lazyServiceClient = this.makeClientType({ credentials: tempCreds, region: this.region });
      return this.lazyServiceClient;
    }

    awsClient() {
      // Return a client (or promise of a client) on which to perform VPC-related queries.
      // Under the hood, an EC2 client is required to query VPC information
      let client = this.lazyServiceClient || this.makeClient();
      return client;
    }

    async queryWithFilter(nameFilterKey) {
      // Query the object via the client instance
      const params = {
                        Filters: [
                          {
                            'Name': nameFilterKey,
                            'Values': [this.name]
                          } ]
                    };

      const client = await this.awsClient();
      const result = await client.describeDBInstances(params).promise();

      return result;
    }

    tryConnection(port, address, timeout_ms) {
      let p = new Promise((resolve, reject) => {
        let s = net.createConnection(port, address);
        s.on('connect', () => { s.destroy(); resolve(true)} );
        s.on('error', () => { s.destroy(); reject(false)} );

        // If there has been no response, naturally terminate the socket/promise
        setTimeout(() => {s.destroy(); reject(false)}, timeout_ms);
        });

      return p;

    }
    toString() {
        return `${this.typeName}: ${this.name}`;
    }

}