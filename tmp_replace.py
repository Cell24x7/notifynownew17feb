import os

file_path = r'c:\SandeepYadav\NotifyProject\notifynownew17feb\frontend\src\components\campaigns\CampaignCreationStepper.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                                                         <Input
                                                            placeholder="Enter static value..."
                                                            className="flex-1"
                                                            value={campaignData.fieldMapping[variable]?.value || ''}
                                                            onChange={(e) => {
                                                               setCampaignData(prev => ({
                                                                  ...prev,
                                                                  fieldMapping: { ...prev.fieldMapping, [variable]: { type: 'custom', value: e.target.value } }
                                                               }));
                                                            }}
                                                         />"""

replacement = """                                                         <div className="flex flex-1 gap-2 items-center">
                                                            <Input
                                                               placeholder={variable === 'header_url' ? "Enter URL or Handle..." : "Enter static value..."}
                                                               className="flex-1"
                                                               value={campaignData.fieldMapping[variable]?.value || ''}
                                                               onChange={(e) => {
                                                                  setCampaignData(prev => ({
                                                                     ...prev,
                                                                     fieldMapping: { ...prev.fieldMapping, [variable]: { type: 'custom', value: e.target.value } }
                                                                  }));
                                                               }}
                                                            />
                                                            {variable === 'header_url' && campaignData.channel === 'whatsapp' && (
                                                               <div className="relative">
                                                                  <input
                                                                     type="file"
                                                                     id={`file-upload-${variable}`}
                                                                     className="hidden"
                                                                     accept="image/*,video/*,application/pdf"
                                                                     disabled={isUploadingMedia[variable]}
                                                                     onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;
                                                                        setIsUploadingMedia(prev => ({ ...prev, [variable]: true }));
                                                                        try {
                                                                           const handle = await whatsappService.uploadHeaderHandle(file);
                                                                           setCampaignData(prev => ({
                                                                              ...prev,
                                                                              fieldMapping: { ...prev.fieldMapping, [variable]: { type: 'custom', value: handle } }
                                                                           }));
                                                                           toast({ title: 'Media Uploaded', description: 'Header media uploaded successfully.' });
                                                                        } catch (err: any) {
                                                                           const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to upload header media';
                                                                           toast({ title: 'Upload Failed', description: errMsg, variant: 'destructive' });
                                                                        } finally {
                                                                           setIsUploadingMedia(prev => ({ ...prev, [variable]: false }));
                                                                        }
                                                                     }}
                                                                  />
                                                                  <Button
                                                                     type="button"
                                                                     variant="outline"
                                                                     size="icon"
                                                                     title="Upload Media"
                                                                     disabled={isUploadingMedia[variable]}
                                                                     onClick={() => { document.getElementById(`file-upload-${variable}`)?.click(); }}
                                                                  >
                                                                     {isUploadingMedia[variable] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                                                                  </Button>
                                                               </div>
                                                            )}
                                                         </div>"""

if target in content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content.replace(target, replacement))
    print('Successful Replace')
else:
    print('Target not found')
