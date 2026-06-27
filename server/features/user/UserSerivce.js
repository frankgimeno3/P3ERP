import {
    AdminCreateUserCommand,
    AdminDisableUserCommand,
    AdminEnableUserCommand, AdminSetUserPasswordCommand,
    AdminUpdateUserAttributesCommand,
    CognitoIdentityProviderClient,
    paginateListUsers
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({region: process.env.NEXT_PUBLIC_COGNITO_REGION});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID;

export async function getAllUsers() {
    const paginator = paginateListUsers(
        {client: cognito, pageSize: 60},
        {UserPoolId: USER_POOL_ID}
    );

    const users = [];
    for await (const page of paginator) {
        users.push(...(page.Users ?? []));
    }
    return users;
}

export async function createUser(name, email, password) {
    const createUserInput = {
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
            {Name: "name", Value: name},
            {Name: "email", Value: email},
            {Name: "email_verified", Value: "true"},
        ],
        MessageAction: "SUPPRESS",
        TemporaryPassword: password,
    };

    await cognito.send(new AdminCreateUserCommand(createUserInput));

    await cognito.send(
        new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username: email,
            Password: password,
            Permanent: true,
        })
    );

    return {
        username: email,
        enabled: true,
        attributes: {
            email: email,
            name: name
        }
    };
}

export async function updateUser({username, name, email, enabled, password}) {
    const userAttributes = [];
    if (name) {
        userAttributes.push({Name: "name", Value: name});
    }
    if (email) {
        userAttributes.push({Name: "email", Value: email});
    }
    if (userAttributes.length > 0) {
        await cognito.send(
            new AdminUpdateUserAttributesCommand({
                UserPoolId: USER_POOL_ID,
                Username: username,
                UserAttributes: userAttributes,
            })
        );
    }

    if (enabled === true) {
        await cognito.send(
            new AdminEnableUserCommand({UserPoolId: USER_POOL_ID, Username: username})
        );
    } else if(enabled === false) {
        await cognito.send(
            new AdminDisableUserCommand({UserPoolId: USER_POOL_ID, Username: username})
        );
    }

    if (password) {
        await cognito.send(
            new AdminSetUserPasswordCommand({
                UserPoolId: USER_POOL_ID,
                Username: username,
                Password: password,
                Permanent: true,
            })
        );
    }

    return {message: "User updated successfully"};
}