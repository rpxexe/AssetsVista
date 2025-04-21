import mongoose,{ Schema,Document,Model } from 'mongoose';
import { Department, DepartmentModel } from './setting/Departments.model';


export interface People extends Document{
    name:string;
    title:string;
    email:string;
    phone:string;
    username:string;
    department:Department[];
}
const PeopleSchema: Schema<People> = new Schema(
  {
    name: {
       type: String, 
       required: true 
      },
    title:{
      type:String, 
    },
    email: { 
      type: String, 
    },
    phone: { 
      type: String,
    },
    username: { 
      type: String, 
      required: true 
    },
    department: [DepartmentModel],
  },
  { timestamps: true }
);

export const PeopleModel: Model<People> = (mongoose.models.People) || mongoose.model<People>(
  "People",
  PeopleSchema
);
