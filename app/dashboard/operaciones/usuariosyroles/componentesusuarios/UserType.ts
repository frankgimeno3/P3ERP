interface Attributes {
    email: string;
    sub: string;
    name: string;
}

export interface UserType {
    username: string;
    enabled: boolean;
    attributes: Attributes;
}