import {DataTypes} from "sequelize";
import {TimeLogTypeEnum} from "../features/timeLog/TimeLogTypeEnum.js";
import TimeLogModel from "../features/timeLog/TimeLogModel.js";
import Database from "./database.js";
import {ModificationStatusEnum} from "../features/modification/ModificationStatusEnum.js";
import ModificationModel from "../features/modification/ModificationModel.js";
import CuentaModel from "../features/cuenta/CuentaModel.js";
import {defineAssociations} from "./associations.js";

const database = Database.getInstance();
const sequelize = database.getSequelize();

TimeLogModel.init({
    id: {type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true},
    createdBy: {type: DataTypes.STRING, allowNull: false},
    ip: {type: DataTypes.STRING},
    type: {type: DataTypes.ENUM(...Object.values(TimeLogTypeEnum)), allowNull: false},
    date: {type: DataTypes.DATE, allowNull: false},
    comment: {type: DataTypes.TEXT},
}, {
    sequelize,
    modelName: 'timeLog',
    underscored: true,
    indexes: [
        {fields: ['created_by']},
        {fields: ['type']},
        {fields: ['created_at']}
    ]
});

ModificationModel.init({
    id: {type: DataTypes.BIGINT, primaryKey: true, unique: true, autoIncrement: true},
    timeLogId: {type: DataTypes.BIGINT, allowNull: false},
    status: {type: DataTypes.ENUM(...Object.values(ModificationStatusEnum)), allowNull: false},
    oldType: {type: DataTypes.ENUM(...Object.values(TimeLogTypeEnum)), allowNull: false},
    newType: {type: DataTypes.ENUM(...Object.values(TimeLogTypeEnum)), allowNull: false},
    oldDate: {type: DataTypes.DATE},
    newDate: {type: DataTypes.DATE},
    comment: {type: DataTypes.TEXT},
    createdBy: {type: DataTypes.STRING, allowNull: false},
    reviewedBy: {type: DataTypes.STRING},
    reviewedAt: {type: DataTypes.DATE},
}, {
    sequelize,
    modelName: 'modification',
    underscored: true,
    indexes: [
        { fields: ['time_log_id'] },
        { fields: ['created_by'] },
        { fields: ['reviewed_by'] },
        { fields: ['status'] },
        { fields: ['reviewed_at'] },
    ]
});

CuentaModel.init({
    id_cuenta: {type: DataTypes.STRING, primaryKey: true, unique: true},
    nombre_empresa: {type: DataTypes.STRING, allowNull: false},
    pais_cuenta: {type: DataTypes.STRING, allowNull: false},
    id_agente: {type: DataTypes.STRING, allowNull: false},
    descripcion_cuenta: {type: DataTypes.TEXT},
    actividades_cuenta: {type: DataTypes.TEXT},
    presente_en_qq: {type: DataTypes.BOOLEAN, defaultValue: false},
    fuente_novedades_cuenta: {type: DataTypes.STRING},
    datos_comerciales: {type: DataTypes.JSONB, defaultValue: {}},
    array_direcciones_cuenta: {type: DataTypes.JSONB, defaultValue: []},
    array_contactos_cuenta: {type: DataTypes.JSONB, defaultValue: []},
    array_comentarios_cuenta: {type: DataTypes.JSONB, defaultValue: []},
    createdBy: {type: DataTypes.STRING, allowNull: false},
}, {
    sequelize,
    modelName: 'cuenta',
    underscored: true,
    indexes: [
        {fields: ['id_cuenta']},
        {fields: ['nombre_empresa']},
        {fields: ['id_agente']},
        {fields: ['created_by']},
        {fields: ['created_at']}
    ]
});

defineAssociations();

export { TimeLogModel, ModificationModel, CuentaModel };