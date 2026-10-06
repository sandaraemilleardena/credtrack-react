import ProtectedRoute from './ProtectedRoute';

import useSystemData from '../hooks/useSystemData';

import {PortalContext} from '../hooks/PortalContext';

import StaffShell from './StaffShell';

export default function StaffPortal(props){return <ProtectedRoute allowedRoles={[props.role]}><StaffPortalContent {...props}/></ProtectedRoute>;}

function StaffPortalContent({role,component:Page}){

 const system=useSystemData(role);

 if(!system.data)return <div role="status" style={{padding:32}}>{system.error||'Loading your saved workspace…'}{system.error&&<button onClick={system.refresh}>Retry</button>}</div>;

 return <PortalContext.Provider value={system}><StaffShell role={role}><Page role={role}/></StaffShell></PortalContext.Provider>;

}
