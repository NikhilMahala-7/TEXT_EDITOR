import { InlineNode, TextNode , Doc } from "./Schema.js";

export class EditorView
{
    constructor(keyMap , _id)
    {
        this.Document = Doc ; 
        this.CaretPos =  this.Document.EvalProps().End_abs + 1; // initially it is set to End 
        this.keyMap = keyMap;
        this.PosArr = [] ; // will only contain two values 
        this.ResetHolds()


        this.EditorDiv = document.querySelector(_id);
        this.Wrapper = document.createElement('div');
        this.Wrapper.className = "Editor"
        this.Wrapper.innerHTML = this.Document.parseDocument() ; 
        this.EditorDiv.append(this.Wrapper)
    }

    ResetView()
    {
        this.Document.resetPos() ; 
    }


    EnableEditing()
    {
        document.addEventListener('keydown',(e) => 
        {
            Edit(this , e)
        })
    }


    Destory() // will do later 
    {
        this.Document = Doc ; 
    }

    ResetHolds()
    {
        this.Styles = this.Document.ExtractStyles(this.CaretPos - 1) ; 
        this.OnHoldTypes = JSON.parse(JSON.stringify(this.Styles.IncludedTypes)) ; 
        this.OnHoldStyles = JSON.parse(JSON.stringify(this.Styles.CompleteStyles)) ; 
        this.isChanged = false ;
        this.BoldChange = false ; 
        this.UnderLineChange = false ;  
        this.ItalicChange = false ; 
        this.StyleChange = false ; 
    }


    EvalChange()
    {
        this.isChanged = this.BoldChange || this.UnderLineChange || this.ItalicChange || this.StyleChange
        if(Object.keys(this.OnHoldStyles).length !== 0)
        {
            if(!this.OnHoldTypes.includes("SP")){this.OnHoldTypes.push("SP")}
        }
        else
        {
            var idx = this.OnHoldTypes.indexOf("SP");
            if(idx === -1) return ; 
            this.OnHoldTypes.splice(idx , 1)
        }
    }


    ToggleBold()
    {
        console.log("toggling the Bold with current styles" , this.OnHoldTypes)
        if(this.OnHoldTypes.includes("ST"))
        {
            var idx = this.OnHoldTypes.indexOf("ST");
            this.OnHoldTypes.splice(idx , 1)
        }
        else{this.OnHoldTypes.push("ST")}
        this.BoldChange = !this.BoldChange ; 
        this.EvalChange()
        console.log("toggled the Bold with current styles" , this.OnHoldTypes, this.isChanged , this.Styles)
    }

    ToggleItalic()
    {
        console.log("toggling the italic with current styles" , this.OnHoldTypes)
        if(this.OnHoldTypes.includes("EM"))
        {
            var idx = this.OnHoldTypes.indexOf("EM");
            this.OnHoldTypes.splice(idx , 1)
        }
        else{this.OnHoldTypes.push("EM")}
        this.ItalicChange = !this.ItalicChange ; 
        this.EvalChange()
        console.log("toggled the italic with current styles" , this.OnHoldTypes, this.isChanged , this.Styles)
    }

    ToggleUnderline()
    {
        console.log("toggling the UnderLine with current styles" , this.OnHoldTypes)
        if(this.OnHoldTypes.includes("UL"))
        {
            var idx = this.OnHoldTypes.indexOf("UL");
            this.OnHoldTypes.splice(idx , 1)
        }
        else{this.OnHoldTypes.push("UL")}
        this.UnderLineChange = !this.UnderLineChange ; 
        this.EvalChange()
        console.log("toggled the underline with current styles" , this.OnHoldTypes, this.isChanged , this.Styles)
    }


    ToggleStyle(Obj)
    {
        for(let key in Obj)
        {
            if(!this.OnHoldStyles[key] || this.OnHoldStyles[key] !== Obj[key])
            {
                this.StyleChange = true;
            }
            this.OnHoldStyles[key] = Obj[key];
        }
        this.EvalChange() ; 
    }


    moveCaret(val)
    {
        this.CaretPos += val ; 
        this.PosArr.splice(0,1);
        this.PosArr.push(this.CaretPos);
        this.ResetHolds()
    }


    InsertWord(word)
    {
        if(this.isChanged)
        {
            this.ResetView()
            if(this.OnHoldTypes.length !== 0)
            {
            this.Document.InsertInlineNode_Layered(this.OnHoldTypes,this.OnHoldStyles,this.CaretPos)
            this.Document.ExtendTextNode(this.CaretPos + 1,word)
            }
            else{
                this.Document.insertTextNode_1(this.CaretPos , word)
            }
            this.ResetView()
            this.Wrapper.innerHTML = this.Document.parseDocument()
            this.moveCaret(1)
        }
        else
        {
            var _hasU = this.Document.ExtendTextNode(this.CaretPos,word);
            this.Wrapper.innerHTML = this.Document.parseDocument()
            if(_hasU){
                this.moveCaret(0)
            }else{this.moveCaret(1)}
        }
    }


    InsertParagraph()
    {
        this.Document.insertBlockNode("PH",this.CaretPos);
        this.Wrapper.innerHTML = this.Document.parseDocument()
        this.moveCaret(1)
    }


    sliceText()
    {
        this.ResetView() ; 
        this.Document.SliceText(this.CaretPos);
        this.ResetView() ; 
        this.Wrapper.innerHTML = this.Document.parseDocument()
        this.moveCaret(-1)
    }


}


var Edit = (className , event ) => 
{
    if(event.ctrlKey && event.key === 'b')
    {
        className.ToggleBold();
        return 
    }


    if(event.ctrlKey && event.key === 'i')
    {
        className.ToggleItalic();
        return 
    }

    if(event.ctrlKey && event.key === 'u')
    {
        event.preventDefault()
        className.ToggleUnderline();
        return 
    }

    if(event.ctrlKey && event.key === 'q')
    {
        event.preventDefault()
        console.log("we toggled style")
        className.ToggleStyle({"color" : "blue"})
        return 
    }


    if(event.key.length === 1 && event.key !== "")
    {
            className.InsertWord(event.key)
    }

    if(event.key === "")
    {
        className.InsertWord("\u0020")
    }

    if(event.key === "Backspace")
    {
        className.sliceText()
    }

    if(event.key === "Enter")
    {
        console.log("pressing the enter key")
        className.InsertParagraph()
    }

}
