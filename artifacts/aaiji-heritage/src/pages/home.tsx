import React, { useState, useRef, useEffect } from "react";
import { useListFrames } from "@workspace/api-client-react";
import { UploadCloud, CheckCircle2, ChevronRight, X, Download, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Home() {
  const { data: frames, isLoading: framesLoading } = useListFrames();
  const { toast } = useToast();
  
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [motherName, setMotherName] = useState("");
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCardUrl, setGeneratedCardUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleGenerate = async () => {
    if (!photo || !motherName.trim() || !selectedFrameId) {
      toast({
        title: "Missing details",
        description: "Please upload a photo, enter a name, and select a frame.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("photo", photo);
      formData.append("motherName", motherName.trim());
      formData.append("frameId", selectedFrameId);

      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/cards/generate`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to generate card");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setGeneratedCardUrl(url);
      
      toast({
        title: "Card generated successfully",
        description: "Your beautifully crafted card is ready.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not generate card. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedCardUrl) {
      const a = document.createElement("a");
      a.href = generatedCardUrl;
      a.download = `mothers-day-card-${motherName.trim().replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  return (
    <main className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 md:px-8 relative overflow-x-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
      <div className="max-w-3xl w-full relative z-10">
        
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-5xl md:text-6xl font-serif text-primary tracking-tight">MomentsforMaa</h1>
          <p className="text-lg md:text-xl text-muted-foreground font-serif italic max-w-lg mx-auto">
            Craft a timeless memory. A heartfelt token of appreciation for the mother figure in your life.
          </p>
        </header>

        <div className="space-y-12">
          
          {/* Step 1: Photo Upload */}
          <section className="bg-card border border-card-border p-8 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-serif text-foreground mb-6 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-sans font-medium">1</span>
              A cherished memory
            </h2>
            
            <div className="flex flex-col items-center justify-center">
              {!photoPreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-md aspect-[4/3] border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 group"
                  data-testid="button-upload-photo"
                >
                  <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-foreground">Upload a photograph</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG, or HEIC</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-md rounded-xl overflow-hidden shadow-md group">
                  <img src={photoPreview} alt="Preview" className="w-full h-auto object-cover aspect-[4/3] object-center" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="secondary" 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-background/90 text-foreground hover:bg-background"
                      data-testid="button-change-photo"
                    >
                      Change Photo
                    </Button>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg, image/png, image/heic"
                onChange={handlePhotoUpload}
                data-testid="input-file"
              />
            </div>
          </section>

          {/* Step 2: Name */}
          <section className="bg-card border border-card-border p-8 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
            <h2 className="text-2xl font-serif text-foreground mb-6 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-sans font-medium">2</span>
              To whom is this dedicated?
            </h2>
            
            <div className="max-w-md mx-auto relative">
              <Input 
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="e.g. Dearest Maa, Grandma"
                className="text-2xl font-[var(--font-handwriting)] text-center py-8 bg-transparent border-b-2 border-x-0 border-t-0 border-primary/30 rounded-none focus-visible:ring-0 focus-visible:border-primary shadow-none px-0"
                data-testid="input-mother-name"
              />
            </div>
          </section>

          {/* Step 3: Frame Selection */}
          <section className="bg-card border border-card-border p-8 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            <h2 className="text-2xl font-serif text-foreground mb-6 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-sans font-medium">3</span>
              Select a heritage frame
            </h2>
            
            {framesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {frames?.map((frame) => {
                  const isSelected = selectedFrameId === frame.id;
                  const previewUrl = frame.previewImage 
                    ? `${import.meta.env.BASE_URL.replace(/\/$/, "")}${frame.previewImage}`
                    : null;

                  return (
                    <div 
                      key={frame.id}
                      onClick={() => setSelectedFrameId(frame.id)}
                      className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300 ${
                        isSelected 
                          ? 'ring-4 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' 
                          : 'hover:scale-[1.02] hover:shadow-md'
                      }`}
                      data-testid={`button-select-frame-${frame.id}`}
                    >
                      <div className="aspect-[3/4] bg-muted flex items-center justify-center relative">
                        {previewUrl ? (
                          <img src={previewUrl} alt={frame.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-card border-t border-card-border">
                        <p className="font-serif font-medium text-sm text-center">{frame.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Step 4: Generate */}
          <section className="flex justify-center pt-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
            <Button
              size="lg"
              className="px-12 py-8 rounded-full text-xl font-serif bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              onClick={handleGenerate}
              disabled={isGenerating || !photo || !motherName.trim() || !selectedFrameId}
              data-testid="button-generate"
            >
              {isGenerating ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Crafting your card...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Generate Masterpiece
                  <ChevronRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </section>

        </div>
      </div>
      {/* Result Lightbox */}
      <Dialog open={!!generatedCardUrl} onOpenChange={(open) => !open && setGeneratedCardUrl(null)}>
        <DialogContent className="max-w-2xl bg-card border-primary/20 p-0 overflow-hidden shadow-2xl">
          <div className="bg-primary/5 p-8 flex flex-col items-center">
            <DialogHeader className="mb-6 text-center">
              <DialogTitle className="text-3xl font-serif text-primary">Your card is ready!</DialogTitle>
              <DialogDescription className="font-sans text-muted-foreground">
                A beautiful heritage keepsake, crafted with love.
              </DialogDescription>
            </DialogHeader>
            
            {generatedCardUrl && (
              <div className="relative w-full max-w-md mx-auto shadow-2xl rounded-sm overflow-hidden mb-8">
                <img src={generatedCardUrl} alt="Generated Mother's Day Card" className="w-full h-auto" />
              </div>
            )}

            <Button 
              size="lg" 
              onClick={handleDownload}
              className="rounded-full px-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium shadow-md"
              data-testid="button-download"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Keepsake
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
