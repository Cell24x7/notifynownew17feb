export interface Permission {
    feature: string;
    admin: boolean;
    manager: boolean;
    agent: boolean;
}

export interface PlanPermissions {
    [key: string]: Permission[];
}
