import {NextResponse} from "next/server";
import {TimeLogNotFound} from "./features/timeLog/TimeLogError.js";
import {
    InvalidParameterException,
    InvalidPasswordException,
    UsernameExistsException
} from "@aws-sdk/client-cognito-identity-provider";

export function errorHandler(error){

    if(error instanceof TimeLogNotFound){
        return NextResponse.json({message: error.message}, {status: 404});
    }

    if(error instanceof InvalidPasswordException){
        return NextResponse.json({message: error.message}, {status: 400});
    }

    if(error instanceof InvalidParameterException){
        return NextResponse.json({message: error.message}, {status: 400});
    }

    if(error instanceof UsernameExistsException){
        return NextResponse.json({message: error.message}, {status: 400});
    }

    console.error("Internal server error");
    console.error(error);
    // TODO Implement AWS SNS for internal server errors
    return NextResponse.json({message: "Error interno del servidor "}, {status: 500});
}