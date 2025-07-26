"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { 
  User, 
  Target, 
  Bell, 
  Palette, 
  Brain, 
  Trash2, 
  Download, 
  Upload,
  Save,
  X
} from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  // Mock user settings state
  const [settings, setSettings] = useState({
    // Profile
    name: "Demo User",
    email: "demo@example.com",
    bio: "Exploring life scenarios with AI assistance",
    
    // Goals
    goals: [
      "Achieve financial independence",
      "Maintain good health",
      "Build meaningful relationships"
    ],
    newGoal: "",
    
    // Preferences
    notifications: {
      simulationComplete: true,
      newInsights: true,
      weeklyReport: false,
    },
    
    // AI Settings
    aiSettings: {
      simulationDepth: 3,
      maxBranches: 5,
      optimismBias: 0.5, // -1 to 1 scale
      riskTolerance: 0.5, // 0 to 1 scale
    },
    
    // Display
    display: {
      theme: "dark",
      animationsEnabled: true,
      autoHighlight: true,
      showProbabilities: true,
    }
  });

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const addGoal = () => {
    if (settings.newGoal.trim()) {
      setSettings(prev => ({
        ...prev,
        goals: [...prev.goals, prev.newGoal.trim()],
        newGoal: ""
      }));
    }
  };

  const removeGoal = (index: number) => {
    setSettings(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    // In a real app, this would save to backend
    console.log("Saving settings:", settings);
    onClose();
  };

  const exportData = () => {
    // In a real app, this would export user data
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'foresight-settings.json';
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5 text-emerald-400" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Customize your Foresight experience and AI preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-600">Profile</TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-emerald-600">Goals</TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-emerald-600">AI Settings</TabsTrigger>
            <TabsTrigger value="display" className="data-[state=active]:bg-emerald-600">Display</TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-emerald-600">Data</TabsTrigger>
          </TabsList>

          <div className="mt-6 max-h-[50vh] overflow-y-auto">
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  Profile Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={settings.name}
                      onChange={(e) => updateSetting('name', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      onChange={(e) => updateSetting('email', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={settings.bio}
                    onChange={(e) => updateSetting('bio', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-400" />
                  Notifications
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Simulation Complete</Label>
                      <p className="text-sm text-gray-400">Get notified when simulations finish</p>
                    </div>
                    <Switch
                      checked={settings.notifications.simulationComplete}
                      onCheckedChange={(checked) => updateSetting('notifications.simulationComplete', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New Insights</Label>
                      <p className="text-sm text-gray-400">Receive AI-generated insights about your scenarios</p>
                    </div>
                    <Switch
                      checked={settings.notifications.newInsights}
                      onCheckedChange={(checked) => updateSetting('notifications.newInsights', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weekly Report</Label>
                      <p className="text-sm text-gray-400">Get weekly summaries of your life exploration</p>
                    </div>
                    <Switch
                      checked={settings.notifications.weeklyReport}
                      onCheckedChange={(checked) => updateSetting('notifications.weeklyReport', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-400" />
                  Life Goals
                </h3>
                
                <div className="space-y-3">
                  {settings.goals.map((goal, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                      <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                        {index + 1}
                      </Badge>
                      <span className="flex-1">{goal}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGoal(index)}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a new life goal..."
                    value={settings.newGoal}
                    onChange={(e) => updateSetting('newGoal', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <Button onClick={addGoal} className="bg-emerald-600 hover:bg-emerald-700">
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* AI Settings Tab */}
            <TabsContent value="ai" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-emerald-400" />
                  AI Simulation Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Simulation Depth: {settings.aiSettings.simulationDepth}</Label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={settings.aiSettings.simulationDepth}
                      onChange={(e) => updateSetting('aiSettings.simulationDepth', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-sm text-gray-400">How many steps into the future to simulate</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Max Branches: {settings.aiSettings.maxBranches}</Label>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      value={settings.aiSettings.maxBranches}
                      onChange={(e) => updateSetting('aiSettings.maxBranches', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-sm text-gray-400">Maximum number of scenarios to explore at each step</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Risk Tolerance: {(settings.aiSettings.riskTolerance * 100).toFixed(0)}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.aiSettings.riskTolerance}
                      onChange={(e) => updateSetting('aiSettings.riskTolerance', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-sm text-gray-400">How comfortable you are with uncertain outcomes</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Display Tab */}
            <TabsContent value="display" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-emerald-400" />
                  Display Preferences
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Animations</Label>
                      <p className="text-sm text-gray-400">Enable smooth transitions and effects</p>
                    </div>
                    <Switch
                      checked={settings.display.animationsEnabled}
                      onCheckedChange={(checked) => updateSetting('display.animationsEnabled', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto Highlight</Label>
                      <p className="text-sm text-gray-400">Automatically highlight related nodes</p>
                    </div>
                    <Switch
                      checked={settings.display.autoHighlight}
                      onCheckedChange={(checked) => updateSetting('display.autoHighlight', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Probabilities</Label>
                      <p className="text-sm text-gray-400">Display probability percentages on edges</p>
                    </div>
                    <Switch
                      checked={settings.display.showProbabilities}
                      onCheckedChange={(checked) => updateSetting('display.showProbabilities', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Data Management</h3>
                
                <div className="space-y-3">
                  <Button
                    onClick={exportData}
                    variant="outline"
                    className="w-full justify-start border-gray-600 text-white hover:bg-gray-800"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-600 text-white hover:bg-gray-800"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                  
                  <Separator className="bg-gray-700" />
                  
                  <div className="space-y-2">
                    <Label className="text-red-400">Danger Zone</Label>
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Data
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <Button variant="outline" onClick={onClose} className="border-gray-600 text-white hover:bg-gray-800">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}