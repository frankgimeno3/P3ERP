import {ModificationModel, TimeLogModel} from "../../database/models.js";
import {ModificationStatusEnum} from "./ModificationStatusEnum.js";
import {ModificationNotFound} from "./ModificationError.js";
import {TimeLogNotFound} from "../timeLog/TimeLogError.js";

export async function createModification(logId, newType,newDate, comment, creatorUsername){
    const timeLog = await TimeLogModel.findByPk(logId);

    if(!timeLog) throw new TimeLogNotFound("Este fichaje no existe");

    const modification = await ModificationModel.create({
        timeLogId: logId,
        status: ModificationStatusEnum.pending,
        oldType: timeLog.type,
        newType: newType,
        oldDate: timeLog.date,
        newDate: newDate,
        comment: comment,
        createdBy: creatorUsername
    })

    return modification;
}

export async function setModificationStatus(modificationId, newStatus){
    const modification = await ModificationModel.findByPk(modificationId,{
        include: {
            model: TimeLogModel,
            as: 'timeLog'
        }
    });

    if(!modification) throw new ModificationNotFound("No encontrado")

    modification.status = newStatus;
    modification.reviewedAt = new Date();

    if(modification.status === ModificationStatusEnum.approved){
        const timeLog = modification.timeLog;
        timeLog.type = modification.newType;
        timeLog.date = modification.newDate;

        await timeLog.save();
    }

    await modification.save();

    return modification;
}

export async function getUsersModifications(status){
    const modifications = await ModificationModel.findAll({
        where:{
            status:status
        },
        include: {model: TimeLogModel, as: 'timeLog'},
    });

    return modifications;
}