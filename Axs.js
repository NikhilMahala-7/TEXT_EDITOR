
export class Style 
{
    constructor(marks , marksInherited = {} ) // attribute will be an array of attribute of arrays // marks will be an object or value  
    {
        this.marks = marks ;
        this.Styles = "";
        this.getStyle(); 
        this.InheritedStyles = marksInherited ;
        this.CompleteStyle = {} ; 
        this.getFullStyle(); 
    }


    getStyle()
    {
        var str = "";
        if(typeof(this.marks) === "object")  
        {
            for(let key in this.marks)
            {
                str += (key + " : " + this.marks[key] + " ; ")
            }
        }

        this.Styles =  str;
    }

    updateStyles(LKM)
    {
        this.InheritedStyles = LKM ;
        this.CompleteStyle = {} ; 
        this.getFullStyle(); 
    }

    getFullStyle()
    {
        for(let key in this.marks)
        {
            this.CompleteStyle[key] = this.marks[key];
        }

        for(let key in this.InheritedStyles)
        {
            if(!this.CompleteStyle[key])
            {
                this.CompleteStyle[key] = this.InheritedStyles[key]
            }
        }
    }

    ChangeStyles(object)
    {
        var key = object.key ; 
        var value = object[key];

        this.marks[key] = value ;  // if new then add it , else change it 
        this.getStyle(); 
    }

    DeleteStyle(styleName)
    {
        if(this.marks[styleName])
        {
            delete this.marks[styleName];
            this.getStyle() ; 
        }
    }

    IsSuitable(object)
    {
        var NoMatchCount = 0 ; 
        var NotMatched = {} ; 
        for(let key in object)
        {
            if(object[key] && this.CompleteStyle[key] && (this.CompleteStyle[key] !== object[key]))
            {
                NoMatchCount++;
                NotMatched[key] = object[key];
            }
        }

        if(NoMatchCount > 2) {return {_bool : false } }
        return {_bool : true , newStyles : NotMatched} 
    }

}






