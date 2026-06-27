import TimeLogModel from "../features/timeLog/TimeLogModel.js";
import ModificationModel from "../features/modification/ModificationModel.js";

let associationsAlreadyDefined = false;

export function defineAssociations() {
    if (associationsAlreadyDefined) return;
    associationsAlreadyDefined = true;

    TimeLogModel.hasMany(ModificationModel, {
        foreignKey: 'time_log_id',
        as: 'modifications',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })

    ModificationModel.belongsTo(TimeLogModel, {
        foreignKey: 'time_log_id',
        as: 'timeLog'
    })
}