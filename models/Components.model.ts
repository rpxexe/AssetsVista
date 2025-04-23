import mongoose, { Document, Model, Schema } from "mongoose";
export interface Component extends Document{

}
const ComponentSchema:Schema<Component>=new Schema({}, { timestamps: true });
export const ComponentModel:Model<Component>=(mongoose.models.Component) || mongoose.model<Component>("Component",ComponentSchema)