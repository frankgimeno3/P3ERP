import {COGNITO} from "../../../env.js";
import {
    AdminListGroupsForUserCommand,
    CognitoIdentityProviderClient
} from "@aws-sdk/client-cognito-identity-provider";

export async function getUserRoles(username) {
    const client = new CognitoIdentityProviderClient({
        region: COGNITO.REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });

    const command = new AdminListGroupsForUserCommand({
        UserPoolId: COGNITO.USER_POOL_ID,
        Username: username
    });

    const result = await client.send(command);
    const roles = result.Groups.map(group => group.GroupName)|| ['employee'];
    return roles;
}